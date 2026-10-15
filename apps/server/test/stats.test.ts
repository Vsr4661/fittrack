import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/app.js";
import { closeConnections, createCatalogExercises, registerUser, resetState } from "./helpers.js";

const app = createApp();

type TestUser = { token: string; userId: string };
type SetInput = { reps: number; weightGrams?: number; isWarmup?: boolean };
let alice: TestUser; // the viewer in most tests
let bob: TestUser; // followed by alice
let carol: TestUser; // a stranger
let ex: Awaited<ReturnType<typeof createCatalogExercises>>;

beforeEach(async () => {
  await resetState();
  ex = await createCatalogExercises();
  [alice, bob, carol] = [await registerUser(app, "alice"), await registerUser(app, "bob"), await registerUser(app, "carol")];
});
afterAll(closeConnections);

const as = (u: TestUser) => ({ Authorization: `Bearer ${u.token}` });
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();

async function post(
  u: TestUser,
  { sets, exerciseId = ex.bench, visibility = "PUBLIC", ago = 1 }: { sets: SetInput[]; exerciseId?: string; visibility?: "PUBLIC" | "FOLLOWERS" | "PRIVATE"; ago?: number },
) {
  const res = await request(app)
    .post("/api/v1/workouts")
    .set(as(u))
    .send({ title: "W", visibility, startedAt: daysAgo(ago), exercises: [{ exerciseId, sets }] });
  if (res.status !== 201) throw new Error(JSON.stringify(res.body));
  return res.body.workout.id as string;
}

const progress = (u: TestUser, since = daysAgo(30)) => request(app).get("/api/v1/progress").query({ since }).set(as(u));
const leaderboard = (u: TestUser, query: Record<string, string> = {}) => request(app).get("/api/v1/leaderboard").query(query).set(as(u));

describe("GET /progress", () => {
  it("requires auth and a valid, bounded `since`", async () => {
    expect((await request(app).get("/api/v1/progress").query({ since: daysAgo(7) })).status).toBe(401);
    expect((await request(app).get("/api/v1/progress").set(as(alice))).status).toBe(400); // missing
    expect((await progress(alice, "last tuesday")).status).toBe(400);
    expect((await progress(alice, daysAgo(400))).status).toBe(400); // over a year
    expect((await progress(alice, daysAgo(-2))).status).toBe(400); // future
  });

  it("returns only my sessions since `since`, with working-set volume", async () => {
    await post(alice, { sets: [{ reps: 10, weightGrams: 20_000, isWarmup: true }, { reps: 5, weightGrams: 60_000 }], ago: 2 });
    await post(alice, { sets: [{ reps: 5, weightGrams: 60_000 }], ago: 20 }); // before `since`
    await post(bob, { sets: [{ reps: 5, weightGrams: 100_000 }], ago: 2 }); // someone else's

    const res = await progress(alice, daysAgo(10));

    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(1);
    expect(res.body.sessions[0]).toMatchObject({ setCount: 1, volumeGrams: 300_000 }); // 5 × 60kg; warmup excluded
  });

  it("finds the heaviest working set per exercise, ignoring warmups and other users", async () => {
    await post(alice, { sets: [{ reps: 8, weightGrams: 80_000 }], ago: 9 });
    const best = await post(alice, { sets: [{ reps: 3, weightGrams: 100_000 }, { reps: 1, weightGrams: 140_000, isWarmup: true }], ago: 5 });
    await post(alice, { sets: [{ reps: 5, weightGrams: 120_000 }], exerciseId: ex.squat, ago: 3 });
    await post(bob, { sets: [{ reps: 1, weightGrams: 200_000 }], ago: 1 });

    const prs = (await progress(alice)).body.personalRecords;

    expect(prs).toHaveLength(2);
    // Newest record first
    expect(prs[0]).toMatchObject({ exercise: { name: "Back Squat" }, weightGrams: 120_000, reps: 5, sessionCount: 1 });
    expect(prs[1]).toMatchObject({ exercise: { name: "Bench Press" }, weightGrams: 100_000, reps: 3, workoutId: best, sessionCount: 2 });
  });

  it("breaks ties: same weight → more reps; full tie → the earliest (a repeat isn't a new record)", async () => {
    const first = await post(alice, { sets: [{ reps: 5, weightGrams: 100_000 }], ago: 6 });
    await post(alice, { sets: [{ reps: 5, weightGrams: 100_000 }], ago: 3 }); // exact repeat
    expect((await progress(alice)).body.personalRecords[0].workoutId).toBe(first);

    const moreReps = await post(alice, { sets: [{ reps: 6, weightGrams: 100_000 }], ago: 1 });
    expect((await progress(alice)).body.personalRecords[0]).toMatchObject({ workoutId: moreReps, reps: 6, sessionCount: 3 });
  });

  it("has no records for bodyweight-only sets", async () => {
    await post(alice, { sets: [{ reps: 20 }] });
    expect((await progress(alice)).body.personalRecords).toEqual([]);
  });
});

describe("GET /leaderboard", () => {
  const follow = (who: TestUser, username: string) => request(app).put(`/api/v1/users/${username}/follow`).set(as(who));

  it("ranks me and the people I follow, not strangers", async () => {
    await follow(alice, "user_bob");
    await post(alice, { sets: [{ reps: 5, weightGrams: 50_000 }] }); // 250kg
    await post(bob, { sets: [{ reps: 5, weightGrams: 100_000 }] }); // 500kg
    await post(carol, { sets: [{ reps: 5, weightGrams: 200_000 }] }); // stranger

    const res = await leaderboard(alice);

    expect(res.status).toBe(200);
    expect(res.body.entries.map((e: { user: { username: string } }) => e.user.username)).toEqual(["user_bob", "user_alice"]);
    expect(res.body.entries[0]).toMatchObject({ rank: 1, volumeGrams: 500_000, workouts: 1, isMe: false });
    expect(res.body.entries[1]).toMatchObject({ rank: 2, isMe: true });
    expect(res.body.entries[0].user).not.toHaveProperty("email");
  });

  it("never counts someone else's private workouts, but counts their followers-only ones", async () => {
    await follow(alice, "user_bob");
    await post(bob, { sets: [{ reps: 10, weightGrams: 100_000 }], visibility: "PRIVATE" }); // 1000kg, hidden
    await post(bob, { sets: [{ reps: 1, weightGrams: 10_000 }], visibility: "FOLLOWERS" }); // 10kg, visible to alice
    await post(alice, { sets: [{ reps: 1, weightGrams: 5_000 }], visibility: "PRIVATE" }); // my own private: mine to count

    const entries = (await leaderboard(alice)).body.entries;
    const bobRow = entries.find((e: { isMe: boolean }) => !e.isMe);
    const me = entries.find((e: { isMe: boolean }) => e.isMe);

    expect(bobRow).toMatchObject({ workouts: 1, volumeGrams: 10_000 });
    expect(me).toMatchObject({ workouts: 1, volumeGrams: 5_000 });
  });

  it("uses a rolling window and supports ranking by workout count", async () => {
    await follow(alice, "user_bob");
    await post(bob, { sets: [{ reps: 5, weightGrams: 100_000 }], ago: 10 }); // outside 7d, inside 30d
    await post(alice, { sets: [{ reps: 1, weightGrams: 1_000 }], ago: 1 });
    await post(alice, { sets: [{ reps: 1, weightGrams: 1_000 }], ago: 2 });

    const week = (await leaderboard(alice, { period: "7d" })).body.entries;
    expect(week.find((e: { isMe: boolean }) => !e.isMe)).toMatchObject({ workouts: 0, volumeGrams: 0 });

    const month = (await leaderboard(alice, { period: "30d", metric: "workouts" })).body;
    expect(month).toMatchObject({ period: "30d", metric: "workouts" });
    expect(month.entries[0]).toMatchObject({ isMe: true, workouts: 2 }); // 2 workouts beat 1 heavy one
  });

  it("gives tied scores the same rank (1, 1, 3)", async () => {
    await follow(alice, "user_bob");
    await follow(alice, "user_carol");
    await post(alice, { sets: [{ reps: 5, weightGrams: 50_000 }] });
    await post(bob, { sets: [{ reps: 5, weightGrams: 50_000 }] });

    const ranks = (await leaderboard(alice)).body.entries.map((e: { rank: number }) => e.rank);

    expect(ranks).toEqual([1, 1, 3]);
  });

  it("validates its query", async () => {
    expect((await leaderboard(alice, { period: "1y" })).status).toBe(400);
    expect((await leaderboard(alice, { metric: "likes" })).status).toBe(400);
    expect((await request(app).get("/api/v1/leaderboard")).status).toBe(401);
  });
});
