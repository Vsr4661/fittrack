import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { headObject, s3 } from "../src/lib/storage.js";
import { STALE_UPLOAD_MS, sweepStaleUploads } from "../src/modules/uploads/uploads.service.js";
import { closeConnections, createCatalogExercises, eventually, registerUser, resetState, uploadImage } from "./helpers.js";

const app = createApp();

type TestUser = { token: string; userId: string };
let alice: TestUser;
let bob: TestUser;
let ex: Awaited<ReturnType<typeof createCatalogExercises>>;

beforeEach(async () => {
  await resetState();
  ex = await createCatalogExercises();
  alice = await registerUser(app, "alice");
  bob = await registerUser(app, "bob");
});
afterAll(async () => {
  s3.destroy();
  await closeConnections();
});

const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` });
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const workoutBody = (overrides: Record<string, unknown> = {}) => ({
  title: "Push day",
  startedAt: minutesAgo(60),
  exercises: [{ exerciseId: ex.bench, sets: [{ reps: 8, weightGrams: 80_000 }] }],
  ...overrides,
});
const create = (user: TestUser, body: object) => request(app).post("/api/v1/workouts").set(as(user)).send(body);
const gone = (key: string) => eventually(async () => (await headObject(key)) === null);

describe("POST /uploads", () => {
  it("requires auth", async () => {
    const res = await request(app).post("/api/v1/uploads").send({ kind: "AVATAR", contentType: "image/jpeg", size: 10 });
    expect(res.status).toBe(401);
  });

  it("returns a link for a server-chosen key under the caller's id", async () => {
    const res = await request(app)
      .post("/api/v1/uploads")
      .set(as(alice))
      .send({ kind: "WORKOUT_PHOTO", contentType: "image/png", size: 2000, filename: "../../etc/passwd" });

    expect(res.status).toBe(201);
    expect(res.body.key).toMatch(new RegExp(`^workout-photos/${alice.userId}/[0-9a-f-]{36}\\.png$`));
    expect(res.body).toMatchObject({ method: "PUT", headers: { "Content-Type": "image/png" } });
  });

  it.each([
    ["a non-image type", { contentType: "text/html", size: 100 }],
    ["SVG (can carry scripts)", { contentType: "image/svg+xml", size: 100 }],
    ["more than 5 MB", { contentType: "image/jpeg", size: 5 * 1024 * 1024 + 1 }],
    ["an empty file", { contentType: "image/jpeg", size: 0 }],
  ])("rejects %s", async (_label, body) => {
    const res = await request(app).post("/api/v1/uploads").set(as(alice)).send({ kind: "WORKOUT_PHOTO", ...body });
    expect(res.status).toBe(400);
  });

  it("caps unfinished uploads per user (429)", async () => {
    await prisma.upload.createMany({
      data: Array.from({ length: 20 }, (_, i) => ({
        key: `workout-photos/${alice.userId}/seed-${i}.jpg`,
        userId: alice.userId,
        kind: "WORKOUT_PHOTO" as const,
        contentType: "image/jpeg",
        sizeBytes: 1,
      })),
    });
    const res = await request(app).post("/api/v1/uploads").set(as(alice)).send({ kind: "AVATAR", contentType: "image/jpeg", size: 1 });
    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("TOO_MANY_PENDING_UPLOADS");
  });
});

describe("photos on workouts", () => {
  it("attaches uploads in order, with signed links that load", async () => {
    const keys = [await uploadImage(app, alice), await uploadImage(app, alice)];
    const res = await create(alice, workoutBody({ photoKeys: keys }));

    expect(res.status).toBe(201);
    expect(res.body.workout.photos.map((p: { key: string }) => p.key)).toEqual(keys);
    const image = await fetch(res.body.workout.photos[0].url);
    expect(image.status).toBe(200);
    expect(await prisma.upload.count()).toBe(0); // consumed
  });

  it("shows photos in lists too (feed/history cards)", async () => {
    const key = await uploadImage(app, alice);
    await create(alice, workoutBody({ photoKeys: [key] }));

    const res = await request(app).get("/api/v1/workouts").set(as(alice));
    expect(res.body.items[0].photos).toHaveLength(1);
  });

  it("rejects another user's upload: you can't claim someone else's file", async () => {
    const bobsKey = await uploadImage(app, bob);
    const res = await create(alice, workoutBody({ photoKeys: [bobsKey] }));

    expect(res.status).toBe(400);
    expect(await prisma.workout.count()).toBe(0);
  });

  it("rejects a key that was made up rather than handed out", async () => {
    const res = await create(alice, workoutBody({ photoKeys: [`workout-photos/${alice.userId}/made-up.jpg`] }));
    expect(res.status).toBe(400);
  });

  it("rejects a link that was never uploaded to", async () => {
    const key = await uploadImage(app, alice, "WORKOUT_PHOTO", { send: false });
    const res = await create(alice, workoutBody({ photoKeys: [key] }));

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/finished uploading/);
  });

  it("rejects an avatar upload used as a workout photo", async () => {
    const key = await uploadImage(app, alice, "AVATAR");
    expect((await create(alice, workoutBody({ photoKeys: [key] }))).status).toBe(400);
  });

  it("uses each upload once: a second workout can't reuse it", async () => {
    const key = await uploadImage(app, alice);
    expect((await create(alice, workoutBody({ photoKeys: [key] }))).status).toBe(201);
    expect((await create(alice, workoutBody({ photoKeys: [key] }))).status).toBe(400);
  });

  it("two saves racing for the same upload: exactly one wins", async () => {
    const key = await uploadImage(app, alice);
    const results = await Promise.all([1, 2, 3].map(() => create(alice, workoutBody({ photoKeys: [key] }))));

    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    // Losers get a clean 4xx ("already used"), never a 500 from the UNIQUE(key) backstop
    expect(statuses.filter((s) => s !== 201).every((s) => s === 400 || s === 409)).toBe(true);
    expect(await prisma.workoutPhoto.count({ where: { key } })).toBe(1);
  });

  it("allows at most 4 photos and no duplicates", async () => {
    const keys = await Promise.all(Array.from({ length: 5 }, () => uploadImage(app, alice)));
    expect((await create(alice, workoutBody({ photoKeys: keys }))).status).toBe(400);
    expect((await create(alice, workoutBody({ photoKeys: [keys[0], keys[0]] }))).status).toBe(400);
  });

  it("gives no photo links to people who can't see the workout", async () => {
    const key = await uploadImage(app, alice);
    const { body } = await create(alice, workoutBody({ visibility: "PRIVATE", photoKeys: [key] }));

    const detail = await request(app).get(`/api/v1/workouts/${body.workout.id}`).set(as(bob));
    const list = await request(app).get("/api/v1/users/user_alice/workouts").set(as(bob));

    expect(detail.status).toBe(404);
    expect(list.body.items).toEqual([]);
  });

  it("on edit: keeps sent photos, adds new ones, deletes removed files", async () => {
    const [keep, drop] = [await uploadImage(app, alice), await uploadImage(app, alice)];
    const { body } = await create(alice, workoutBody({ photoKeys: [keep, drop] }));
    const added = await uploadImage(app, alice);

    const res = await request(app)
      .put(`/api/v1/workouts/${body.workout.id}`)
      .set(as(alice))
      .send(workoutBody({ photoKeys: [added, keep] }));

    expect(res.status).toBe(200);
    expect(res.body.workout.photos.map((p: { key: string }) => p.key)).toEqual([added, keep]);
    expect(await gone(drop)).toBe(true);
    expect(await headObject(keep)).not.toBeNull();
  });

  it("on edit: can't steal a photo from another of your workouts", async () => {
    const key = await uploadImage(app, alice);
    await create(alice, workoutBody({ photoKeys: [key] }));
    const other = await create(alice, workoutBody());

    const res = await request(app)
      .put(`/api/v1/workouts/${other.body.workout.id}`)
      .set(as(alice))
      .send(workoutBody({ photoKeys: [key] }));
    expect(res.status).toBe(400);
  });

  it("deleting a workout deletes its files", async () => {
    const key = await uploadImage(app, alice);
    const { body } = await create(alice, workoutBody({ photoKeys: [key] }));

    await request(app).delete(`/api/v1/workouts/${body.workout.id}`).set(as(alice)).expect(204);
    expect(await gone(key)).toBe(true);
  });
});

describe("sweepStaleUploads", () => {
  it("deletes uploads never attached within a day, with their files; keeps fresh ones", async () => {
    const stale = await uploadImage(app, alice);
    const fresh = await uploadImage(app, alice);
    await prisma.upload.update({ where: { key: stale }, data: { createdAt: new Date(Date.now() - STALE_UPLOAD_MS - 1000) } });

    expect(await sweepStaleUploads()).toBe(1);
    expect(await headObject(stale)).toBeNull();
    expect(await prisma.upload.findUnique({ where: { key: fresh } })).not.toBeNull();
    expect(await headObject(fresh)).not.toBeNull();
  });

  it("keeps the row when a file delete fails, so the next run retries it", async () => {
    const key = await uploadImage(app, alice);
    await prisma.upload.update({ where: { key }, data: { createdAt: new Date(Date.now() - STALE_UPLOAD_MS - 1000) } });

    const failingDelete = () => Promise.reject(new Error("storage down"));
    expect(await sweepStaleUploads(Date.now(), failingDelete)).toBe(0);
    expect(await prisma.upload.findUnique({ where: { key } })).not.toBeNull();
  });
});
