import { prisma } from "../../lib/prisma.js";
import { authorSelect } from "../users/users.select.js";
import { visibleTo } from "../workouts/visibility.js";
import { volumeGrams, volumeSetSelect, workingSets } from "../workouts/volume.js";
import { PERIOD_DAYS, type LeaderboardQuery, type ProgressQuery } from "./stats.schemas.js";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Leaderboard size cap: you plus up to this many people you follow. */
const MAX_FOLLOWING = 500;

const workoutSetsSelect = { exercises: { select: { sets: { select: volumeSetSelect } } } } as const;

// ─── Progress (your own data only) ─────────────────────

interface PrRow {
  exerciseId: string;
  weightGrams: number;
  reps: number;
  workoutId: string;
  startedAt: Date;
  sessionCount: number;
}

/**
 * Sessions since `since` (for the weekly charts; the client groups them into
 * weeks in its own time zone) plus a personal record per exercise.
 */
export async function getProgress(userId: string, { since }: ProgressQuery) {
  const [workouts, prRows] = await Promise.all([
    prisma.workout.findMany({
      where: { userId, startedAt: { gte: since } },
      orderBy: [{ startedAt: "asc" }, { id: "asc" }],
      select: { id: true, startedAt: true, ...workoutSetsSelect },
    }),
    personalRecords(userId),
  ]);

  const exercises = await prisma.exercise.findMany({
    where: { id: { in: prRows.map((r) => r.exerciseId) } },
    select: { id: true, name: true, muscleGroup: true },
  });
  const byId = new Map(exercises.map((e) => [e.id, e]));

  return {
    sessions: workouts.map((w) => {
      const sets = w.exercises.flatMap((e) => e.sets);
      return { id: w.id, startedAt: w.startedAt, setCount: workingSets(sets).length, volumeGrams: volumeGrams(sets) };
    }),
    personalRecords: prRows.map((r) => ({
      exercise: byId.get(r.exerciseId)!, // exercises can't be deleted while used (onDelete: Restrict)
      weightGrams: r.weightGrams,
      reps: r.reps,
      workoutId: r.workoutId,
      achievedAt: r.startedAt,
      // How many of your workouts include this exercise. The app celebrates a
      // PR only when sessionCount > 1: your very first bench press is
      // trivially a "record" and confetti for it would mean nothing.
      sessionCount: r.sessionCount,
    })),
  };
}

/**
 * Heaviest working set per exercise. Same weight → more reps wins; a full tie
 * → the EARLIEST one, so repeating a record doesn't count as a new record.
 * Weighted sets only: bodyweight-rep and cardio records aren't modelled yet.
 *
 * Raw SQL because "the whole row with the max per group" is DISTINCT ON in
 * Postgres: one indexed pass, where Prisma's groupBy could only return the max
 * weight (not the reps, date and workout that go with it). $queryRaw's tagged
 * template sends ${userId} as a bound parameter, never spliced into the SQL.
 */
function personalRecords(userId: string) {
  return prisma.$queryRaw<PrRow[]>`
    WITH working AS (
      SELECT we."exerciseId", s."weightGrams", s.reps, w.id AS "workoutId", w."startedAt"
      FROM workout_sets s
      JOIN workout_exercises we ON we.id = s."workoutExerciseId"
      JOIN workouts w ON w.id = we."workoutId"
      WHERE w."userId" = ${userId}::uuid
        AND s."isWarmup" = false
        AND s."weightGrams" > 0
        AND s.reps > 0
    ),
    best AS (
      SELECT DISTINCT ON ("exerciseId") *
      FROM working
      ORDER BY "exerciseId", "weightGrams" DESC, reps DESC, "startedAt" ASC, "workoutId" ASC
    )
    SELECT b.*,
      (SELECT COUNT(DISTINCT x."workoutId") FROM working x WHERE x."exerciseId" = b."exerciseId")::int AS "sessionCount"
    FROM best b
    ORDER BY b."startedAt" DESC, b."exerciseId" ASC
  `;
}

// ─── Leaderboard (you + people you follow) ─────────────

export async function getLeaderboard(viewerId: string, { period, metric }: LeaderboardQuery) {
  const since = new Date(Date.now() - PERIOD_DAYS[period] * DAY_MS);
  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
    orderBy: { createdAt: "asc" },
    take: MAX_FOLLOWING,
  });
  const ids = [viewerId, ...following.map((f) => f.followingId)];

  const [users, workouts] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids } }, select: authorSelect }),
    prisma.workout.findMany({
      // visibleTo: the leaderboard only adds up workouts the viewer could open.
      // Someone's "Only me" workouts never leak into their rank on your board.
      where: { AND: [visibleTo(viewerId), { userId: { in: ids } }, { startedAt: { gte: since } }] },
      select: { userId: true, ...workoutSetsSelect },
    }),
  ]);

  const totals = new Map(ids.map((id) => [id, { workouts: 0, volumeGrams: 0 }]));
  for (const w of workouts) {
    const t = totals.get(w.userId)!;
    t.workouts += 1;
    t.volumeGrams += volumeGrams(w.exercises.flatMap((e) => e.sets));
  }

  const score = (id: string) => (metric === "volume" ? totals.get(id)!.volumeGrams : totals.get(id)!.workouts);
  const other = (id: string) => (metric === "volume" ? totals.get(id)!.workouts : totals.get(id)!.volumeGrams);
  const sorted = [...users].sort(
    (a, b) => score(b.id) - score(a.id) || other(b.id) - other(a.id) || a.username.localeCompare(b.username),
  );

  // Competition ranking (1, 1, 3): equal scores share a rank, so two people
  // tied on volume both see "1st" instead of one being arbitrarily 2nd.
  let rank = 0;
  const entries = sorted.map((user, i) => {
    if (i === 0 || score(user.id) !== score(sorted[i - 1]!.id)) rank = i + 1;
    return { rank, user, ...totals.get(user.id)!, isMe: user.id === viewerId };
  });

  return { period, metric, since, entries };
}
