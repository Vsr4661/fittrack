import { afterAll, beforeEach, describe, expect, it } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { closeConnections, createCatalogExercises, registerUser, resetState } from "./helpers.js";

const app = createApp();

let alice: { token: string; userId: string };
let bob: { token: string; userId: string };
let ex: Awaited<ReturnType<typeof createCatalogExercises>>;

beforeEach(async () => {
  await resetState();
  ex = await createCatalogExercises();
  alice = await registerUser(app, "alice");
  bob = await registerUser(app, "bob");
});
afterAll(closeConnections);

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

function workoutBody(overrides: Record<string, unknown> = {}) {
  return {
    title: "Push day",
    startedAt: minutesAgo(60),
    endedAt: minutesAgo(5),
    exercises: [
      {
        exerciseId: ex.bench,
        sets: [
          { reps: 10, weightGrams: 40_000, isWarmup: true },
          { reps: 8, weightGrams: 80_000 },
          { reps: 6, weightGrams: 82_500 },
        ],
      },
      { exerciseId: ex.run, sets: [{ durationSec: 600, distanceM: 2000 }] },
    ],
    ...overrides,
  };
}

const as = (user: { token: string }) => ({ Authorization: `Bearer ${user.token}` });
const create = (user: { token: string }, body: object = workoutBody()) =>
  request(app).post("/api/v1/workouts").set(as(user)).send(body);

describe("GET /exercises", () => {
  it("lists the catalog and supports search", async () => {
    const all = await request(app).get("/api/v1/exercises").set(as(alice));
    const search = await request(app).get("/api/v1/exercises?search=squ").set(as(alice));

    expect(all.body.exercises.map((e: { name: string }) => e.name)).toEqual([
      "Back Squat",
      "Bench Press",
      "Running",
    ]);
    expect(search.body.exercises).toHaveLength(1);
  });

  it("hides other users' custom exercises", async () => {
    await prisma.exercise.create({
      data: { name: "Bob's Secret Curl", muscleGroup: "ARMS", equipment: "CABLE", createdById: bob.userId },
    });

    const res = await request(app).get("/api/v1/exercises?search=secret").set(as(alice));

    expect(res.body.exercises).toHaveLength(0);
  });
});

describe("POST /workouts", () => {
  it("creates a workout with ordered exercises, numbered sets and stats", async () => {
    const res = await create(alice);

    expect(res.status).toBe(201);
    const { workout } = res.body;
    expect(workout.exercises.map((e: { position: number }) => e.position)).toEqual([1, 2]);
    expect(workout.exercises[0].sets.map((s: { setNumber: number }) => s.setNumber)).toEqual([1, 2, 3]);
    expect(workout.exercises[0].exercise.name).toBe("Bench Press");
    expect(workout.stats).toEqual({
      exerciseCount: 2,
      setCount: 3, // the warmup set doesn't count
      totalVolumeGrams: 8 * 80_000 + 6 * 82_500, // warmup excluded, cardio has no weight
      durationSec: 55 * 60,
    });
  });

  it("requires authentication", async () => {
    const res = await request(app).post("/api/v1/workouts").send(workoutBody());

    expect(res.status).toBe(401);
  });

  it.each([
    ["no exercises", { exercises: [] }, "exercises"],
    ["an exercise with no sets", { exercises: [{ exerciseId: "0199b2f0-0000-7000-8000-000000000000", sets: [] }] }, "exercises"],
    ["a set with nothing measured", { exercises: [{ exerciseId: "0199b2f0-0000-7000-8000-000000000000", sets: [{ isWarmup: false }] }] }, "exercises"],
    ["negative reps", { exercises: [{ exerciseId: "0199b2f0-0000-7000-8000-000000000000", sets: [{ reps: -1 }] }] }, "exercises"],
    ["fractional grams", { exercises: [{ exerciseId: "0199b2f0-0000-7000-8000-000000000000", sets: [{ reps: 5, weightGrams: 1.5 }] }] }, "exercises"],
    ["end before start", { startedAt: minutesAgo(10), endedAt: minutesAgo(20) }, "endedAt"],
    ["a start in the future", { startedAt: new Date(Date.now() + 3_600_000).toISOString(), endedAt: undefined }, "startedAt"],
    ["an empty title", { title: "   " }, "title"],
  ])("rejects %s with 400", async (_label, overrides, field) => {
    const res = await create(alice, workoutBody(overrides));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.fieldErrors).toHaveProperty(field);
  });

  it("rejects an exercise id that doesn't exist (400, not a 500 from the FK)", async () => {
    const res = await create(alice, workoutBody({ exercises: [{ exerciseId: "0199b2f0-0000-7000-8000-000000000000", sets: [{ reps: 5 }] }] }));

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("One or more exercises don't exist");
  });

  it("rejects another user's custom exercise", async () => {
    const bobs = await prisma.exercise.create({
      data: { name: "Bob's Curl", muscleGroup: "ARMS", equipment: "CABLE", createdById: bob.userId },
    });

    const res = await create(alice, workoutBody({ exercises: [{ exerciseId: bobs.id, sets: [{ reps: 5 }] }] }));

    expect(res.status).toBe(400);
  });
});

describe("GET /workouts (cursor pagination)", () => {
  it("returns only my workouts, newest first, across pages without gaps or duplicates", async () => {
    for (const [title, ago] of [["oldest", 300], ["middle", 200], ["newest", 100]] as const) {
      await create(alice, workoutBody({ title, startedAt: minutesAgo(ago), endedAt: minutesAgo(ago - 30) }));
    }
    await create(bob, workoutBody({ title: "bob's" }));

    const page1 = await request(app).get("/api/v1/workouts?limit=2").set(as(alice));
    const page2 = await request(app)
      .get(`/api/v1/workouts?limit=2&cursor=${page1.body.nextCursor}`)
      .set(as(alice));

    expect(page1.body.items.map((w: { title: string }) => w.title)).toEqual(["newest", "middle"]);
    expect(page1.body.nextCursor).toEqual(expect.any(String));
    expect(page2.body.items.map((w: { title: string }) => w.title)).toEqual(["oldest"]);
    expect(page2.body.nextCursor).toBeNull();
  });

  it("returns summary cards, not every set", async () => {
    await create(alice);

    const res = await request(app).get("/api/v1/workouts").set(as(alice));

    const [card] = res.body.items;
    expect(card.exerciseNames).toEqual(["Bench Press", "Running"]);
    expect(card.stats.setCount).toBe(3);
    expect(card).not.toHaveProperty("exercises");
  });

  it("rejects an out-of-range limit", async () => {
    const res = await request(app).get("/api/v1/workouts?limit=500").set(as(alice));

    expect(res.status).toBe(400);
  });
});

describe("GET /workouts/:id (visibility)", () => {
  it("lets the owner see their private workout", async () => {
    const { body } = await create(alice, workoutBody({ visibility: "PRIVATE" }));

    const res = await request(app).get(`/api/v1/workouts/${body.workout.id}`).set(as(alice));

    expect(res.status).toBe(200);
  });

  it("returns 404 (not 403) for someone else's private workout", async () => {
    const { body } = await create(alice, workoutBody({ visibility: "PRIVATE" }));

    const res = await request(app).get(`/api/v1/workouts/${body.workout.id}`).set(as(bob));

    expect(res.status).toBe(404);
  });

  it("lets others see a public workout", async () => {
    const { body } = await create(alice, workoutBody({ visibility: "PUBLIC" }));

    const res = await request(app).get(`/api/v1/workouts/${body.workout.id}`).set(as(bob));

    expect(res.status).toBe(200);
  });

  it("returns 400 for a malformed id", async () => {
    const res = await request(app).get("/api/v1/workouts/not-a-uuid").set(as(alice));

    expect(res.status).toBe(400);
  });
});

describe("PUT /workouts/:id", () => {
  it("replaces the whole workout, including its exercises and sets", async () => {
    const { body } = await create(alice);

    const res = await request(app)
      .put(`/api/v1/workouts/${body.workout.id}`)
      .set(as(alice))
      .send(workoutBody({ title: "Leg day", exercises: [{ exerciseId: ex.squat, sets: [{ reps: 5, weightGrams: 100_000 }] }] }));

    expect(res.status).toBe(200);
    expect(res.body.workout.title).toBe("Leg day");
    expect(res.body.workout.exercises).toHaveLength(1);
    expect(await prisma.workoutSet.count()).toBe(1); // old sets really are gone
  });

  it("can't edit someone else's workout", async () => {
    const { body } = await create(alice);

    const res = await request(app).put(`/api/v1/workouts/${body.workout.id}`).set(as(bob)).send(workoutBody({ title: "hacked" }));

    expect(res.status).toBe(404);
    const stored = await prisma.workout.findUniqueOrThrow({ where: { id: body.workout.id } });
    expect(stored.title).toBe("Push day");
  });
});

describe("DELETE /workouts/:id", () => {
  it("deletes my workout and cascades to its exercises and sets", async () => {
    const { body } = await create(alice);

    const res = await request(app).delete(`/api/v1/workouts/${body.workout.id}`).set(as(alice));

    expect(res.status).toBe(204);
    expect(await prisma.workoutExercise.count()).toBe(0);
    expect(await prisma.workoutSet.count()).toBe(0);
  });

  it("can't delete someone else's workout", async () => {
    const { body } = await create(alice);

    const res = await request(app).delete(`/api/v1/workouts/${body.workout.id}`).set(as(bob));

    expect(res.status).toBe(404);
    expect(await prisma.workout.count()).toBe(1);
  });
});
