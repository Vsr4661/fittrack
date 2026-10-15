import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/app.js";
import { cacheKeys } from "../src/lib/cache.js";
import { prisma } from "../src/lib/prisma.js";
import { redis } from "../src/lib/redis.js";
import { closeConnections, createCatalogExercises, registerUser, resetState } from "./helpers.js";

const app = createApp();

type TestUser = { token: string; userId: string };
let alice: TestUser; // posts workouts
let bob: TestUser; // follows alice
let carol: TestUser; // a stranger
let ex: Awaited<ReturnType<typeof createCatalogExercises>>;

beforeEach(async () => {
  await resetState();
  ex = await createCatalogExercises();
  [alice, bob, carol] = [await registerUser(app, "alice"), await registerUser(app, "bob"), await registerUser(app, "carol")];
});
afterAll(closeConnections);

const as = (u: TestUser) => ({ Authorization: `Bearer ${u.token}` });
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

async function postWorkout(u: TestUser, visibility: "PUBLIC" | "FOLLOWERS" | "PRIVATE", title: string = visibility, ago = 60) {
  const res = await request(app)
    .post("/api/v1/workouts")
    .set(as(u))
    .send({ title, visibility, startedAt: minutesAgo(ago), exercises: [{ exerciseId: ex.bench, sets: [{ reps: 5, weightGrams: 60_000 }] }] });
  return res.body.workout.id as string;
}

const follow = (who: TestUser, username: string) => request(app).put(`/api/v1/users/${username}/follow`).set(as(who));
const getWorkout = (who: TestUser, id: string) => request(app).get(`/api/v1/workouts/${id}`).set(as(who));

describe("follow / unfollow", () => {
  it("follows idempotently and updates profile counts", async () => {
    expect((await follow(bob, "user_alice")).status).toBe(204);
    expect((await follow(bob, "user_alice")).status).toBe(204); // second time: no error, no duplicate

    const profile = await request(app).get("/api/v1/users/user_alice").set(as(bob));

    expect(profile.body.profile).toMatchObject({ counts: { followers: 1, following: 0 }, isFollowing: true, isMe: false });
    expect(await prisma.follow.count()).toBe(1);
  });

  it("unfollows", async () => {
    await follow(bob, "user_alice");
    expect((await request(app).delete("/api/v1/users/user_alice/follow").set(as(bob))).status).toBe(204);

    const profile = await request(app).get("/api/v1/users/user_alice").set(as(bob));

    expect(profile.body.profile).toMatchObject({ counts: { followers: 0 }, isFollowing: false });
  });

  it("rejects following yourself and unknown users", async () => {
    expect((await follow(alice, "user_alice")).status).toBe(400);
    expect((await follow(alice, "nobody_here")).status).toBe(404);
  });
});

describe("profiles", () => {
  it("never exposes another user's email", async () => {
    const res = await request(app).get("/api/v1/users/user_alice").set(as(bob));

    expect(res.status).toBe(200);
    expect(res.body.profile).not.toHaveProperty("email");
    expect(JSON.stringify(res.body)).not.toContain("@example.com");
  });

  it("caches counts in Redis and invalidates them on follow", async () => {
    await request(app).get("/api/v1/users/user_alice").set(as(bob)); // warms the cache
    expect(JSON.parse((await redis.get(cacheKeys.profileCounts(alice.userId)))!)).toEqual({ followers: 0, following: 0, workouts: 0 });

    await follow(bob, "user_alice"); // must drop the stale entry...
    const res = await request(app).get("/api/v1/users/user_alice").set(as(carol));

    expect(res.body.profile.counts.followers).toBe(1); // ...so the next read is fresh
  });

  it("invalidates cached counts when the user posts a workout", async () => {
    await request(app).get("/api/v1/users/user_alice").set(as(bob));
    await postWorkout(alice, "PUBLIC");

    const res = await request(app).get("/api/v1/users/user_alice").set(as(bob));

    expect(res.body.profile.counts.workouts).toBe(1);
  });

  it("lists only the workouts the viewer may see on a profile", async () => {
    await postWorkout(alice, "PUBLIC");
    await postWorkout(alice, "FOLLOWERS");
    await postWorkout(alice, "PRIVATE");
    await follow(bob, "user_alice");

    const titles = async (who: TestUser) =>
      (await request(app).get("/api/v1/users/user_alice/workouts").set(as(who))).body.items.map((w: { title: string }) => w.title).sort();

    expect(await titles(alice)).toEqual(["FOLLOWERS", "PRIVATE", "PUBLIC"]); // owner sees all
    expect(await titles(bob)).toEqual(["FOLLOWERS", "PUBLIC"]); // follower
    expect(await titles(carol)).toEqual(["PUBLIC"]); // stranger
  });

  it("updates my display name and clears my bio", async () => {
    await request(app).patch("/api/v1/users/me").set(as(alice)).send({ bio: "Lifting since 2020" });
    const res = await request(app).patch("/api/v1/users/me").set(as(alice)).send({ displayName: " Alice L. ", bio: "" });

    expect(res.body.user).toMatchObject({ displayName: "Alice L.", bio: null });
  });

  it("rejects an empty profile update", async () => {
    expect((await request(app).patch("/api/v1/users/me").set(as(alice)).send({})).status).toBe(400);
  });
});

describe("FOLLOWERS visibility on a single workout", () => {
  it("is visible to followers and the owner, and 404 for everyone else", async () => {
    const id = await postWorkout(alice, "FOLLOWERS");
    await follow(bob, "user_alice");

    expect((await getWorkout(alice, id)).status).toBe(200);
    expect((await getWorkout(bob, id)).status).toBe(200);
    expect((await getWorkout(carol, id)).status).toBe(404);
  });

  it("disappears for someone who unfollows", async () => {
    const id = await postWorkout(alice, "FOLLOWERS");
    await follow(bob, "user_alice");
    await request(app).delete("/api/v1/users/user_alice/follow").set(as(bob));

    expect((await getWorkout(bob, id)).status).toBe(404);
  });
});

describe("GET /feed", () => {
  it("shows my workouts and those of people I follow, newest first, respecting visibility", async () => {
    await postWorkout(alice, "PUBLIC", "alice public", 300);
    await postWorkout(alice, "FOLLOWERS", "alice followers", 200);
    await postWorkout(alice, "PRIVATE", "alice private", 100);
    await postWorkout(carol, "PUBLIC", "carol public (not followed)", 50);
    await postWorkout(bob, "PRIVATE", "bob's own private", 10);
    await follow(bob, "user_alice");

    const res = await request(app).get("/api/v1/feed").set(as(bob));

    expect(res.body.items.map((w: { title: string }) => w.title)).toEqual([
      "bob's own private",
      "alice followers",
      "alice public",
    ]);
    expect(res.body.items[1].author).toEqual(expect.objectContaining({ username: "user_alice" }));
    expect(res.body.items[1].author).not.toHaveProperty("email");
  });

  it("paginates with a cursor", async () => {
    for (let i = 0; i < 3; i++) await postWorkout(alice, "PUBLIC", `w${i}`, 100 - i);
    await follow(bob, "user_alice");

    const page1 = await request(app).get("/api/v1/feed?limit=2").set(as(bob));
    const page2 = await request(app).get(`/api/v1/feed?limit=2&cursor=${page1.body.nextCursor}`).set(as(bob));

    expect([...page1.body.items, ...page2.body.items].map((w: { title: string }) => w.title)).toEqual(["w2", "w1", "w0"]);
    expect(page2.body.nextCursor).toBeNull();
  });
});

describe("likes", () => {
  it("is idempotent (PUT twice = one like) and reports likedByMe per viewer", async () => {
    const id = await postWorkout(alice, "PUBLIC");

    await request(app).put(`/api/v1/workouts/${id}/like`).set(as(bob));
    const res = await request(app).put(`/api/v1/workouts/${id}/like`).set(as(bob));

    expect(res.body).toEqual({ likeCount: 1, likedByMe: true });
    expect((await getWorkout(bob, id)).body.workout.social).toMatchObject({ likeCount: 1, likedByMe: true });
    expect((await getWorkout(carol, id)).body.workout.social).toMatchObject({ likeCount: 1, likedByMe: false });
  });

  it("unlikes idempotently", async () => {
    const id = await postWorkout(alice, "PUBLIC");
    await request(app).put(`/api/v1/workouts/${id}/like`).set(as(bob));

    await request(app).delete(`/api/v1/workouts/${id}/like`).set(as(bob));
    const res = await request(app).delete(`/api/v1/workouts/${id}/like`).set(as(bob));

    expect(res.body).toEqual({ likeCount: 0, likedByMe: false });
  });

  it("can't like a workout you can't see", async () => {
    const id = await postWorkout(alice, "PRIVATE");

    expect((await request(app).put(`/api/v1/workouts/${id}/like`).set(as(carol))).status).toBe(404);
    expect(await prisma.like.count()).toBe(0);
  });
});

describe("comments", () => {
  const comment = (who: TestUser, id: string, body: string) =>
    request(app).post(`/api/v1/workouts/${id}/comments`).set(as(who)).send({ body });

  it("adds and lists comments oldest first, with authors but no emails", async () => {
    const id = await postWorkout(alice, "PUBLIC");
    await comment(bob, id, "Nice PR!");
    await comment(alice, id, "  Thanks!  ");

    const res = await request(app).get(`/api/v1/workouts/${id}/comments`).set(as(carol));

    expect(res.body.items.map((c: { body: string }) => c.body)).toEqual(["Nice PR!", "Thanks!"]);
    expect(res.body.items[0].author.username).toBe("user_bob");
    expect(JSON.stringify(res.body)).not.toContain("@example.com");
    expect((await getWorkout(carol, id)).body.workout.social.commentCount).toBe(2);
  });

  it("rejects empty and too-long comments", async () => {
    const id = await postWorkout(alice, "PUBLIC");

    expect((await comment(bob, id, "   ")).status).toBe(400);
    expect((await comment(bob, id, "x".repeat(501))).status).toBe(400);
  });

  it("can't read or write comments on a workout you can't see", async () => {
    const id = await postWorkout(alice, "PRIVATE");

    expect((await comment(carol, id, "hi")).status).toBe(404);
    expect((await request(app).get(`/api/v1/workouts/${id}/comments`).set(as(carol))).status).toBe(404);
  });

  it("lets the comment author and the workout owner delete it, but no one else", async () => {
    const id = await postWorkout(alice, "PUBLIC");
    const c1 = (await comment(bob, id, "first")).body.comment.id;
    const c2 = (await comment(bob, id, "second")).body.comment.id;

    expect((await request(app).delete(`/api/v1/comments/${c1}`).set(as(carol))).status).toBe(404); // stranger
    expect((await request(app).delete(`/api/v1/comments/${c1}`).set(as(bob))).status).toBe(204); // author
    expect((await request(app).delete(`/api/v1/comments/${c2}`).set(as(alice))).status).toBe(204); // workout owner
    expect(await prisma.comment.count()).toBe(0);
  });
});

describe("user search", () => {
  it("finds users by username prefix or display name, excluding me, with isFollowing", async () => {
    await follow(bob, "user_alice");

    const res = await request(app).get("/api/v1/users/search?q=user").set(as(bob));

    expect(res.body.users.map((u: { username: string; isFollowing: boolean }) => [u.username, u.isFollowing])).toEqual([
      ["user_alice", true],
      ["user_carol", false],
    ]);
    expect(res.body.users[0]).not.toHaveProperty("email");
  });

  it("can't register a reserved username that would shadow a route", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "s@example.com", username: "search", password: "correct-horse-battery", displayName: "S" });

    expect(res.status).toBe(400);
    expect(res.body.error.details.fieldErrors.username).toEqual(["This username is reserved"]);
  });
});
