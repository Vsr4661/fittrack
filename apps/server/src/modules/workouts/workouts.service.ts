import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import type { ListWorkoutsQuery, WorkoutInput } from "./workouts.schemas.js";

// ─── Response shapes ───────────────────────────────────

const exerciseSummarySelect = { id: true, name: true, muscleGroup: true, equipment: true } as const;

const setSelect = {
  id: true,
  setNumber: true,
  reps: true,
  weightGrams: true,
  durationSec: true,
  distanceM: true,
  isWarmup: true,
} as const;

const workoutDetailSelect = {
  id: true,
  userId: true,
  title: true,
  notes: true,
  visibility: true,
  startedAt: true,
  endedAt: true,
  createdAt: true,
  exercises: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      position: true,
      notes: true,
      exercise: { select: exerciseSummarySelect },
      sets: { orderBy: { setNumber: "asc" }, select: setSelect },
    },
  },
} satisfies Prisma.WorkoutSelect;

type WorkoutDetail = Prisma.WorkoutGetPayload<{ select: typeof workoutDetailSelect }>;

// ─── Queries ───────────────────────────────────────────

/** Cursor-paginated history, newest first. */
export async function listMyWorkouts(userId: string, { limit, cursor }: ListWorkoutsQuery) {
  const rows = await prisma.workout.findMany({
    where: { userId },
    // startedAt matches the (userId, startedAt DESC) index; id breaks ties so
    // the order is fully deterministic, which cursor pagination requires.
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: limit + 1, // fetch one extra to know if another page exists
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: workoutDetailSelect,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: page.map(toSummary),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}

export async function getWorkout(viewerId: string, workoutId: string) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: workoutDetailSelect,
  });
  // 404 (not 403) for other people's private workouts: don't confirm they exist.
  // FOLLOWERS visibility gets real follower checks in the social phase.
  if (!workout || (workout.userId !== viewerId && workout.visibility !== "PUBLIC")) {
    throw AppError.notFound("Workout not found");
  }
  return { ...workout, stats: computeStats(workout) };
}

// ─── Mutations ─────────────────────────────────────────

export async function createWorkout(userId: string, input: WorkoutInput) {
  await assertExercisesUsable(userId, input);

  // One nested create = one transaction: either the whole workout (with every
  // exercise and set) is saved, or nothing is. No half-saved workouts.
  const workout = await prisma.workout.create({
    data: { userId, ...workoutScalars(input), exercises: { create: nestedExercises(input) } },
    select: workoutDetailSelect,
  });
  return { ...workout, stats: computeStats(workout) };
}

/** PUT semantics: the client sends the whole workout and it replaces what's stored. */
export async function replaceWorkout(userId: string, workoutId: string, input: WorkoutInput) {
  await assertExercisesUsable(userId, input);

  const workout = await prisma.$transaction(async (tx) => {
    const { count } = await tx.workout.updateMany({
      where: { id: workoutId, userId }, // ownership check and update in one statement
      data: workoutScalars(input),
    });
    if (count === 0) throw AppError.notFound("Workout not found");

    // Replacing children wholesale is simpler and safer than diffing them
    await tx.workoutExercise.deleteMany({ where: { workoutId } });
    return tx.workout.update({
      where: { id: workoutId },
      data: { exercises: { create: nestedExercises(input) } },
      select: workoutDetailSelect,
    });
  });
  return { ...workout, stats: computeStats(workout) };
}

export async function deleteWorkout(userId: string, workoutId: string) {
  // Exercises and sets go too, via ON DELETE CASCADE
  const { count } = await prisma.workout.deleteMany({ where: { id: workoutId, userId } });
  if (count === 0) throw AppError.notFound("Workout not found");
}

// ─── Helpers ───────────────────────────────────────────

/** Every exercise must exist and be either built-in or this user's own custom one. */
async function assertExercisesUsable(userId: string, input: WorkoutInput) {
  const ids = [...new Set(input.exercises.map((e) => e.exerciseId))];
  const found = await prisma.exercise.count({
    where: { id: { in: ids }, OR: [{ createdById: null }, { createdById: userId }] },
  });
  // Without this, an unknown id would hit the foreign key and surface as a 500
  if (found !== ids.length) {
    throw AppError.badRequest("One or more exercises don't exist");
  }
}

function workoutScalars(input: WorkoutInput) {
  return {
    title: input.title,
    notes: input.notes ?? null,
    visibility: input.visibility,
    startedAt: input.startedAt,
    endedAt: input.endedAt ?? null,
  };
}

function nestedExercises(input: WorkoutInput) {
  return input.exercises.map((exercise, i) => ({
    position: i + 1,
    exerciseId: exercise.exerciseId,
    notes: exercise.notes ?? null,
    sets: { create: exercise.sets.map((set, j) => ({ setNumber: j + 1, ...set })) },
  }));
}

function computeStats(workout: WorkoutDetail) {
  const workingSets = workout.exercises.flatMap((e) => e.sets).filter((s) => !s.isWarmup);
  return {
    exerciseCount: workout.exercises.length,
    setCount: workingSets.length,
    // Volume = Σ reps × weight over working sets: the standard training-load metric
    totalVolumeGrams: workingSets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weightGrams ?? 0), 0),
    durationSec: workout.endedAt
      ? Math.round((workout.endedAt.getTime() - workout.startedAt.getTime()) / 1000)
      : null,
  };
}

/** List rows don't need every set, just enough for a history card. */
function toSummary(workout: WorkoutDetail) {
  return {
    id: workout.id,
    title: workout.title,
    visibility: workout.visibility,
    startedAt: workout.startedAt,
    endedAt: workout.endedAt,
    exerciseNames: workout.exercises.map((e) => e.exercise.name),
    stats: computeStats(workout),
  };
}
