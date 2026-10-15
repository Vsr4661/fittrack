// Pure helpers for the Progress screen: no React, no clock reads ("now" is
// passed in), so they're unit-tested like the dashboard stats.
import { startOfWeek } from "@/features/dashboard/stats";
import type { PersonalRecord, ProgressSession } from "./types";

export const CHART_WEEKS = 12;

/**
 * Monday 00:00 (local) of each of the last `count` weeks, oldest first.
 * new Date(y, m, d - 7k) rather than "minus 7 × 24h", so a daylight-saving
 * change (a 23- or 25-hour day) can't shift a week start off midnight.
 */
export function chartWeekStarts(now: Date, count = CHART_WEEKS): Date[] {
  const thisWeek = startOfWeek(now);
  return Array.from(
    { length: count },
    (_, i) => new Date(thisWeek.getFullYear(), thisWeek.getMonth(), thisWeek.getDate() - 7 * (count - 1 - i)),
  );
}

export interface WeekBucket {
  weekStart: Date;
  workouts: number;
  volumeGrams: number;
}

/** Groups sessions into the given weeks; empty weeks stay as zeros (gaps are information). */
export function bucketByWeek(sessions: ProgressSession[], weekStarts: Date[]): WeekBucket[] {
  const buckets = weekStarts.map((weekStart) => ({ weekStart, workouts: 0, volumeGrams: 0 }));
  for (const s of sessions) {
    const t = new Date(s.startedAt).getTime();
    // The last week start that's <= the session: weeks are contiguous, so that's its week
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (t >= buckets[i]!.weekStart.getTime()) {
        buckets[i]!.workouts += 1;
        buckets[i]!.volumeGrams += s.volumeGrams;
        break;
      }
    }
  }
  return buckets;
}

/**
 * Records set by this workout that are worth celebrating. A first-ever session
 * of an exercise is trivially a "record" (sessionCount 1), so it doesn't count.
 */
export function newRecordsFrom(workoutId: string, records: PersonalRecord[]): PersonalRecord[] {
  return records.filter((r) => r.workoutId === workoutId && r.sessionCount > 1);
}
