import { afterAll, beforeAll, beforeEach, describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server as HttpServer } from "node:http";
import { SignJWT } from "jose";
import request from "supertest";
import { io as connectClient, type Socket as ClientSocket } from "socket.io-client";
import { createApp } from "../src/app.js";
import { signAccessToken } from "../src/modules/auth/tokens.js";
import { attachRealtime, closeRealtime, type AppServer } from "../src/realtime/io.js";
import { rooms } from "../src/realtime/events.js";
import { closeConnections, createCatalogExercises, registerUser, resetState } from "./helpers.js";

// Real sockets against a real HTTP server on a random port: the handshake,
// middleware and timers are exactly what production runs.
const app = createApp();
let http: HttpServer;
let io: AppServer;
let url: string;
const open: ClientSocket[] = [];

beforeAll(async () => {
  http = app.listen(0);
  await new Promise<void>((resolve) => http.once("listening", resolve));
  io = attachRealtime(http);
  url = `http://localhost:${(http.address() as AddressInfo).port}`;
});

afterAll(async () => {
  for (const s of open) s.disconnect();
  closeRealtime();
  await new Promise<void>((resolve) => http.close(() => resolve()));
  await closeConnections();
});

/** Connects, resolving with the socket or rejecting with the server's error code. */
function connect(auth: Record<string, unknown>): Promise<ClientSocket> {
  const socket = connectClient(url, { auth, transports: ["websocket"], reconnection: false, forceNew: true });
  open.push(socket);
  return new Promise((resolve, reject) => {
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", (err: Error & { data?: { code?: string } }) => reject(new Error(err.data?.code ?? err.message)));
  });
}

/** A token like signAccessToken's, but with any expiry or secret. */
function mintToken(userId: string, { expiresAt, secret = process.env.JWT_ACCESS_SECRET! }: { expiresAt: Date; secret?: string }) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer("fittrack-api")
    .setAudience("fittrack-app")
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(new TextEncoder().encode(secret));
}

describe("socket handshake auth", () => {
  it("rejects a connection with no token", async () => {
    await expect(connect({})).rejects.toThrow("UNAUTHORIZED");
  });

  it("rejects a garbage token and one signed with another secret", async () => {
    await expect(connect({ token: "not-a-jwt" })).rejects.toThrow("UNAUTHORIZED");
    const forged = await mintToken(randomUUID(), { expiresAt: new Date(Date.now() + 60_000), secret: "x".repeat(40) });
    await expect(connect({ token: forged })).rejects.toThrow("UNAUTHORIZED");
  });

  it("tells an expired token apart, so the app knows to refresh", async () => {
    const expired = await mintToken(randomUUID(), { expiresAt: new Date(Date.now() - 1000) });
    await expect(connect({ token: expired })).rejects.toThrow("TOKEN_EXPIRED");
  });

  it("accepts a valid token and puts the socket in its user's room", async () => {
    const userId = randomUUID();
    await connect({ token: await signAccessToken(userId) });

    const inRoom = await io.in(rooms.user(userId)).fetchSockets();

    expect(inRoom).toHaveLength(1);
    expect(inRoom[0]!.data.userId).toBe(userId);
  });
});

describe("token expiry while connected", () => {
  it("warns with session:expired, then disconnects when the token runs out", async () => {
    const token = await mintToken(randomUUID(), { expiresAt: new Date(Date.now() + 2000) });
    const socket = await connect({ token });
    const expired = new Promise<void>((resolve) => socket.once("session:expired", () => resolve()));
    const closed = new Promise<string>((resolve) => socket.once("disconnect", (reason) => resolve(reason)));

    await expired;
    // "io server disconnect": the SERVER cut it (not a network drop), so the
    // client won't auto-reconnect with the dead token
    expect(await closed).toBe("io server disconnect");
  }, 10_000);
});

// ─── Live events ───────────────────────────────────────

type TestUser = { token: string; userId: string };
let alice: TestUser; // posts workouts
let bob: TestUser; // follows alice
let carol: TestUser; // a stranger
let ex: Awaited<ReturnType<typeof createCatalogExercises>>;

/** Resolves with the next `event` payload, or fails after `ms`. */
function nextEvent<T = unknown>(socket: ClientSocket, event: string, ms = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no "${event}" within ${ms}ms`)), ms);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** Collects every `event` during `ms` (for "must NOT receive" assertions). */
async function eventsDuring(socket: ClientSocket, event: string, ms = 400): Promise<unknown[]> {
  const seen: unknown[] = [];
  const handler = (payload: unknown) => seen.push(payload);
  socket.on(event, handler);
  await new Promise((r) => setTimeout(r, ms));
  socket.off(event, handler);
  return seen;
}

const as = (u: TestUser) => ({ Authorization: `Bearer ${u.token}` });
const body = (visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE") => ({
  title: "Push day",
  visibility,
  startedAt: new Date(Date.now() - 3600_000).toISOString(),
  exercises: [{ exerciseId: ex.bench, sets: [{ reps: 5, weightGrams: 60_000 }] }],
});
const post = async (u: TestUser, visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE") =>
  (await request(http).post("/api/v1/workouts").set(as(u)).send(body(visibility))).body.workout.id as string;
const watch = (socket: ClientSocket, workoutId: unknown) =>
  socket.emitWithAck("workout:watch", workoutId) as Promise<{ ok: boolean; error?: string }>;
const socketFor = (u: TestUser) => connect({ token: u.token });

describe("watching a workout", () => {
  beforeEach(async () => {
    await resetState();
    ex = await createCatalogExercises();
    [alice, bob, carol] = [await registerUser(app, "alice"), await registerUser(app, "bob"), await registerUser(app, "carol")];
    await request(http).put("/api/v1/users/user_alice/follow").set(as(bob));
  });

  it("refuses bad ids and workouts you can't see, and sends them nothing", async () => {
    const secret = await post(alice, "PRIVATE");
    const bobSocket = await socketFor(bob);

    expect(await watch(bobSocket, "not-a-uuid")).toEqual({ ok: false, error: "BAD_REQUEST" });
    expect(await watch(bobSocket, secret)).toEqual({ ok: false, error: "NOT_FOUND" }); // same as REST: 404, not 403

    const aliceSocket = await socketFor(alice);
    const leaked = eventsDuring(bobSocket, "workout:likes");
    const selfNotify = eventsDuring(aliceSocket, "notify");
    await request(http).put(`/api/v1/workouts/${secret}/like`).set(as(alice)); // the owner likes her own private workout
    expect(await leaked).toEqual([]);
    expect(await selfNotify).toEqual([]); // and is never notified about her own like
  });

  it("streams likes to watchers and notifies the owner once (not the liker)", async () => {
    const id = await post(alice, "PUBLIC");
    const [aliceSocket, bobSocket, carolSocket] = [await socketFor(alice), await socketFor(bob), await socketFor(carol)];
    expect(await watch(carolSocket, id)).toEqual({ ok: true });

    const likes = nextEvent(carolSocket, "workout:likes");
    const notified = nextEvent(aliceSocket, "notify");
    const selfNotified = eventsDuring(bobSocket, "notify");
    await request(http).put(`/api/v1/workouts/${id}/like`).set(as(bob));

    expect(await likes).toEqual({ workoutId: id, likeCount: 1 });
    expect(await notified).toMatchObject({ type: "like", workoutId: id, workoutTitle: "Push day", actor: { username: "user_bob" } });
    expect(await selfNotified).toEqual([]);

    // A retried PUT (already liked) must not notify the owner a second time
    const again = eventsDuring(aliceSocket, "notify");
    await request(http).put(`/api/v1/workouts/${id}/like`).set(as(bob));
    expect(await again).toEqual([]);
  });

  it("streams comments (public author shape) and their deletion", async () => {
    const id = await post(alice, "PUBLIC");
    const [aliceSocket, carolSocket] = [await socketFor(alice), await socketFor(carol)];
    await watch(carolSocket, id);

    const added = nextEvent<{ comment: { id: string; author: Record<string, unknown> } }>(carolSocket, "workout:comment");
    const notified = nextEvent(aliceSocket, "notify");
    const res = await request(http).post(`/api/v1/workouts/${id}/comments`).set(as(bob)).send({ body: "Strong!" });

    const event = await added;
    expect(event).toMatchObject({ workoutId: id, comment: { body: "Strong!", author: { username: "user_bob" } } });
    expect(event.comment.author).not.toHaveProperty("email");
    expect(await notified).toMatchObject({ type: "comment", actor: { username: "user_bob" } });

    const deleted = nextEvent(carolSocket, "workout:comment-deleted");
    await request(http).delete(`/api/v1/comments/${res.body.comment.id}`).set(as(bob));
    expect(await deleted).toEqual({ workoutId: id, commentId: res.body.comment.id });
  });

  it("removes watchers who can no longer see it when it's made private, keeps the owner", async () => {
    const id = await post(alice, "PUBLIC");
    const [aliceSocket, bobSocket] = [await socketFor(alice), await socketFor(bob)];
    await watch(aliceSocket, id);
    await watch(bobSocket, id);

    const hidden = nextEvent(bobSocket, "workout:hidden");
    await request(http).put(`/api/v1/workouts/${id}`).set(as(alice)).send(body("PRIVATE"));
    expect(await hidden).toEqual({ workoutId: id });

    // Bob is out of the room: later likes reach the owner's socket only
    const bobLikes = eventsDuring(bobSocket, "workout:likes");
    const aliceLikes = nextEvent(aliceSocket, "workout:likes");
    await request(http).put(`/api/v1/workouts/${id}/like`).set(as(alice));
    expect(await aliceLikes).toEqual({ workoutId: id, likeCount: 1 });
    expect(await bobLikes).toEqual([]);
  });

  it("tells watchers when a workout is deleted", async () => {
    const id = await post(alice, "PUBLIC");
    const bobSocket = await socketFor(bob);
    await watch(bobSocket, id);

    const hidden = nextEvent(bobSocket, "workout:hidden");
    await request(http).delete(`/api/v1/workouts/${id}`).set(as(alice));
    expect(await hidden).toEqual({ workoutId: id });
  });
});

describe("feed:new fan-out", () => {
  beforeEach(async () => {
    await resetState();
    ex = await createCatalogExercises();
    [alice, bob, carol] = [await registerUser(app, "alice"), await registerUser(app, "bob"), await registerUser(app, "carol")];
    await request(http).put("/api/v1/users/user_alice/follow").set(as(bob));
  });

  it("reaches followers for public and followers-only workouts, never strangers", async () => {
    const [bobSocket, carolSocket] = [await socketFor(bob), await socketFor(carol)];

    const forBob = nextEvent(bobSocket, "feed:new");
    const forCarol = eventsDuring(carolSocket, "feed:new");
    const id = await post(alice, "PUBLIC");
    expect(await forBob).toMatchObject({ workoutId: id, author: { username: "user_alice" } });
    expect(await forCarol).toEqual([]); // public, but carol doesn't follow alice

    const followersOnly = nextEvent(bobSocket, "feed:new");
    const id2 = await post(alice, "FOLLOWERS");
    expect(await followersOnly).toMatchObject({ workoutId: id2 });
  });

  it("sends nothing at all for a private workout", async () => {
    const bobSocket = await socketFor(bob);
    const seen = eventsDuring(bobSocket, "feed:new");
    await post(alice, "PRIVATE");
    expect(await seen).toEqual([]);
  });
});
