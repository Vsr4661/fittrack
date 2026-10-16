import type { Prisma } from "../../generated/prisma/client.js";
import { cacheKeys, invalidate } from "../../lib/cache.js";
import { prisma } from "../../lib/prisma.js";
import { publishWorkoutChanged, publishWorkoutCreated } from "../../realtime/publish.js";
import { AppError } from "../../utils/AppError.js";
import { assertUploaded, consumeUploads, deleteObjectsLater } from "../uploads/uploads.service.js";
import { authorSelect } from "../users/users.select.js";
import { photosSelect, withPhotoUrls } from "./photos.js";
import { visibleTo } from "./visibility.js";
import { distanceMeters, volumeGrams, workingSets } from "./volume.js";
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

/** Depends on the viewer because "did I like this?" is per-viewer. */
function workoutSelect(viewerId: string) {
  return {
    id: true,
    userId: true,
    title: true,
    notes: true,
    visibility: true,
    startedAt: true,
    endedAt: true,
    createdAt: true,
    user: { select: authorSelect },
    // Counted by the database in the same query: no N+1 round-trips per workout
    _count: { select: { likes: true, comments: true } },
    // At most one row: did *this viewer* like it?
    likes: { where: { userId: viewerId }, select: { userId: true }, take: 1 },
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
    photos: photosSelect,
  } satisfies Prisma.WorkoutSelect;
}

// From the EXTENDED client, so computed fields (author.avatarUrl) are in the type
type WorkoutRow = Prisma.Result<typeof prisma.workout, { select: ReturnType<typeof workoutSelect> }, "findFirstOrThrow">;

// ─── Queries ───────────────────────────────────────────

export function listMyWorkouts(viewerId: string, page: ListWorkoutsQuery) {
  return listWorkouts(viewerId, { userId: viewerId }, page);
}

/** Someone's profile: only the workouts this viewer is allowed to see. */
export function listUserWorkouts(viewerId: string, ownerId: string, page: ListWorkoutsQuery) {
  return listWorkouts(viewerId, { AND: [{ userId: ownerId }, visibleTo(viewerId)] }, page);
}

/**
 * Fan-out on READ: the feed is computed when it's opened, by querying the
 * workouts of everyone I follow. Simple and always consistent; at large scale
 * (users following thousands) you'd switch to fan-out on WRITE, pushing each
 * new workout id into followers' precomputed feeds (e.g. Redis lists).
 */
export function listFeed(viewerId: string, page: ListWorkoutsQuery) {
  return listWorkouts(
    viewerId,
    {
      AND: [
        { OR: [{ userId: viewerId }, { user: { followers: { some: { followerId: viewerId } } } }] },
        visibleTo(viewerId),
      ],
    },
    page,
  );
}

/** Cursor-paginated, newest first. */
async function listWorkouts(viewerId: string, where: Prisma.WorkoutWhereInput, { limit, cursor }: ListWorkoutsQuery) {
  const rows = await prisma.workout.findMany({
    where,
    // startedAt matches the (userId, startedAt DESC) index; id breaks ties so
    // the order is fully deterministic, which cursor pagination requires.
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    take: limit + 1, // fetch one extra to know if another page exists
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: workoutSelect(viewerId),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: await Promise.all(page.map(toSummary)),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}

export async function getWorkout(viewerId: string, workoutId: string) {
  const workout = await prisma.workout.findFirst({
    where: { AND: [{ id: workoutId }, visibleTo(viewerId)] },
    select: workoutSelect(viewerId),
  });
  // 404 (not 403) for workouts you can't see: don't confirm they exist
  if (!workout) throw AppError.notFound("Workout not found");
  return toDetail(workout);
}

/** For likes/comments: you can only interact with workouts you can see. */
export async function assertWorkoutVisible(viewerId: string, workoutId: string) {
  const count = await prisma.workout.count({ where: { AND: [{ id: workoutId }, visibleTo(viewerId)] } });
  if (count === 0) throw AppError.notFound("Workout not found");
}

// ─── Mutations ─────────────────────────────────────────

export async function createWorkout(userId: string, input: WorkoutInput) {
  await assertExercisesUsable(userId, input);
  await assertUploaded(userId, "WORKOUT_PHOTO", input.photoKeys);

  // One transaction: the whole workout (every exercise, set and photo) is
  // saved and its uploads consumed, or nothing is. No half-saved workouts.
  const workout = await prisma.$transaction(async (tx) => {
    await consumeUploads(tx, userId, input.photoKeys);
    return tx.workout.create({
      data: {
        userId,
        ...workoutScalars(input),
        exercises: { create: nestedExercises(input) },
        photos: { create: nestedPhotos(input) },
      },
      select: workoutSelect(userId),
    });
  });
  await invalidate(cacheKeys.profileCounts(userId)); // workout count changed
  publishWorkoutCreated(workout.id, userId);
  return toDetail(workout);
}

/** PUT semantics: the client sends the whole workout and it replaces what's stored. */
export async function replaceWorkout(userId: string, workoutId: string, input: WorkoutInput) {
  await assertExercisesUsable(userId, input);
  // Keys already on this workout are kept; any other key must be a fresh upload.
  // (Filtered by userId: someone else's workout yields [], and the update below 404s.)
  const current = await photoKeysOf({ id: workoutId, userId });
  const added = input.photoKeys.filter((key) => !current.includes(key));
  await assertUploaded(userId, "WORKOUT_PHOTO", added);

  const workout = await prisma.$transaction(async (tx) => {
    const { count } = await tx.workout.updateMany({
      where: { id: workoutId, userId }, // ownership check and update in one statement
      data: workoutScalars(input),
    });
    if (count === 0) throw AppError.notFound("Workout not found");
    await consumeUploads(tx, userId, added);

    // Replacing children wholesale is simpler and safer than diffing them
    await tx.workoutExercise.deleteMany({ where: { workoutId } });
    await tx.workoutPhoto.deleteMany({ where: { workoutId } });
    return tx.workout.update({
      where: { id: workoutId },
      data: { exercises: { create: nestedExercises(input) }, photos: { create: nestedPhotos(input) } },
      select: workoutSelect(userId),
    });
  });
  // Only after the commit: a rolled-back edit must not lose the old files
  deleteObjectsLater(current.filter((key) => !input.photoKeys.includes(key)));
  publishWorkoutChanged(workoutId); // visibility may have changed: re-check watchers
  return toDetail(workout);
}

export async function deleteWorkout(userId: string, workoutId: string) {
  const photoKeys = await photoKeysOf({ id: workoutId, userId });
  // Exercises, sets, photos, likes and comments go too, via ON DELETE CASCADE
  const { count } = await prisma.workout.deleteMany({ where: { id: workoutId, userId } });
  if (count === 0) throw AppError.notFound("Workout not found");
  deleteObjectsLater(photoKeys); // the cascade removed the rows, not the files
  await invalidate(cacheKeys.profileCounts(userId));
  publishWorkoutChanged(workoutId); // it's gone: nobody can see it now
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

function nestedPhotos(input: WorkoutInput) {
  return input.photoKeys.map((key, i) => ({ key, position: i + 1 }));
}

async function photoKeysOf(where: { id: string; userId: string }) {
  const photos = await prisma.workoutPhoto.findMany({ where: { workout: where }, select: { key: true } });
  return photos.map((p) => p.key);
}

function computeStats(workout: WorkoutRow) {
  const sets = workout.exercises.flatMap((e) => e.sets);
  return {
    exerciseCount: workout.exercises.length,
    setCount: workingSets(sets).length,
    totalVolumeGrams: volumeGrams(sets), // shared definition: see volume.ts
    totalDistanceM: distanceMeters(sets),
    durationSec: workout.endedAt
      ? Math.round((workout.endedAt.getTime() - workout.startedAt.getTime()) / 1000)
      : null,
  };
}

function toSocial(workout: WorkoutRow) {
  return {
    likeCount: workout._count.likes,
    commentCount: workout._count.comments,
    likedByMe: workout.likes.length > 0,
  };
}

async function toDetail(workout: WorkoutRow) {
  const { user, _count, likes, photos, ...rest } = workout;
  return {
    ...rest,
    author: user,
    photos: await withPhotoUrls(photos),
    stats: computeStats(workout),
    social: toSocial(workout),
  };
}

/** List rows don't need every set, just enough for a feed/history card. */
async function toSummary(workout: WorkoutRow) {
  return {
    id: workout.id,
    title: workout.title,
    visibility: workout.visibility,
    startedAt: workout.startedAt,
    endedAt: workout.endedAt,
    author: workout.user,
    exerciseNames: workout.exercises.map((e) => e.exercise.name),
    photos: await withPhotoUrls(workout.photos),
    stats: computeStats(workout),
    social: toSocial(workout),
  };
}
