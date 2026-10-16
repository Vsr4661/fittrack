import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/app.js";
import { headObject, s3 } from "../src/lib/storage.js";
import { closeConnections, createCatalogExercises, eventually, registerUser, resetState, uploadImage } from "./helpers.js";

const app = createApp();

type TestUser = { token: string; userId: string };
let alice: TestUser;
let bob: TestUser;

beforeEach(async () => {
  await resetState();
  alice = await registerUser(app, "alice");
  bob = await registerUser(app, "bob");
});
afterAll(async () => {
  s3.destroy();
  await closeConnections();
});

const as = (user: TestUser) => ({ Authorization: `Bearer ${user.token}` });
const setAvatar = (user: TestUser, key: string) =>
  request(app).put("/api/v1/users/me/avatar").set(as(user)).send({ key });
/** avatarUrl is absolute (PUBLIC_API_URL); supertest wants the path. */
const pathOf = (url: string) => new URL(url).pathname;

describe("PUT /users/me/avatar", () => {
  it("sets a stable avatar link that redirects to the image, no login needed", async () => {
    const key = await uploadImage(app, alice, "AVATAR");
    const res = await setAvatar(alice, key);

    expect(res.status).toBe(200);
    expect(res.body.user.avatarUrl).toBe(`${process.env.PUBLIC_API_URL}/api/v1/media/${key}`);
    expect(res.body.user).not.toHaveProperty("avatarKey");

    const redirect = await request(app).get(pathOf(res.body.user.avatarUrl)); // no Authorization header
    expect(redirect.status).toBe(302);
    expect((await fetch(redirect.headers.location!)).status).toBe(200);
  });

  it("shows up wherever the user appears as an author (computed on nested reads)", async () => {
    const ex = await createCatalogExercises();
    const key = await uploadImage(app, alice, "AVATAR");
    await setAvatar(alice, key);
    await request(app)
      .post("/api/v1/workouts")
      .set(as(alice))
      .send({ title: "Legs", startedAt: new Date().toISOString(), exercises: [{ exerciseId: ex.squat, sets: [{ reps: 5 }] }] });

    const list = await request(app).get("/api/v1/users/user_alice/workouts").set(as(bob));
    const profile = await request(app).get("/api/v1/users/user_alice").set(as(bob));

    expect(list.body.items[0].author.avatarUrl).toMatch(/\/api\/v1\/media\/avatars\//);
    expect(profile.body.profile.avatarUrl).toMatch(/\/api\/v1\/media\/avatars\//);
  });

  it("replacing it deletes the old file, and the old link stops working", async () => {
    const first = await uploadImage(app, alice, "AVATAR");
    const oldUrl = (await setAvatar(alice, first)).body.user.avatarUrl;
    await setAvatar(alice, await uploadImage(app, alice, "AVATAR"));

    expect(await eventually(async () => (await headObject(first)) === null)).toBe(true);
    expect((await request(app).get(pathOf(oldUrl))).status).toBe(404);
  });

  it("rejects a workout-photo upload, someone else's upload, and an unfinished one", async () => {
    expect((await setAvatar(alice, await uploadImage(app, alice, "WORKOUT_PHOTO"))).status).toBe(400);
    expect((await setAvatar(alice, await uploadImage(app, bob, "AVATAR"))).status).toBe(400);
    expect((await setAvatar(alice, await uploadImage(app, alice, "AVATAR", { send: false }))).status).toBe(400);
  });

  it("DELETE goes back to initials (and is idempotent)", async () => {
    const key = await uploadImage(app, alice, "AVATAR");
    await setAvatar(alice, key);

    const res = await request(app).delete("/api/v1/users/me/avatar").set(as(alice));
    expect(res.body.user.avatarUrl).toBeNull();
    expect(await eventually(async () => (await headObject(key)) === null)).toBe(true);
    expect((await request(app).delete("/api/v1/users/me/avatar").set(as(alice))).status).toBe(200);
  });
});

describe("GET /media/avatars/... (public)", () => {
  it("won't serve a pending avatar upload that was never set", async () => {
    const key = await uploadImage(app, alice, "AVATAR");
    expect((await request(app).get(`/api/v1/media/${key}`)).status).toBe(404);
  });

  it("can't be used to read workout photos (those stay behind visibleTo)", async () => {
    const key = await uploadImage(app, alice, "WORKOUT_PHOTO");
    const disguised = key.replace("workout-photos/", "avatars/");

    expect((await request(app).get(`/api/v1/media/${key}`)).status).toBe(404);
    expect((await request(app).get(`/api/v1/media/${disguised}`)).status).toBe(404);
  });

  it("validates the path", async () => {
    expect((await request(app).get(`/api/v1/media/avatars/${alice.userId}/..%2F..%2Fx.jpg`)).status).toBe(400);
  });
});
