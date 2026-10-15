import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server as HttpServer } from "node:http";
import { SignJWT } from "jose";
import { io as connectClient, type Socket as ClientSocket } from "socket.io-client";
import { createApp } from "../src/app.js";
import { signAccessToken } from "../src/modules/auth/tokens.js";
import { attachRealtime, closeRealtime, type AppServer } from "../src/realtime/io.js";
import { rooms } from "../src/realtime/events.js";
import { closeConnections } from "./helpers.js";

// Real sockets against a real HTTP server on a random port: the handshake,
// middleware and timers are exactly what production runs.
let http: HttpServer;
let io: AppServer;
let url: string;
const open: ClientSocket[] = [];

beforeAll(async () => {
  http = createApp().listen(0);
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
