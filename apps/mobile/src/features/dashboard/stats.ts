// Dashboard numbers computed on the device from workouts already fetched for
// history. Pure functions (no React, no clock reads) so they're easy to test:
// "now" is always passed in.
//
// Days are the user's LOCAL calendar days. A workout at 23:30 counts for that
// evening, not for "tomorrow in UTC".

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local-midnight timestamp for a date: the key for "which day was this?" */
function localDayKey(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Consecutive days with at least one workout, ending today or yesterday.
 * Ending "yesterday" still counts so the streak doesn't show 0 every morning
 * before you've trained; it only resets once a whole day is missed.
 */
export function computeStreak(startedAts: string[], now: Date): number {
  const days = new Set(startedAts.map((iso) => localDayKey(new Date(iso))));
  const today = localDayKey(now);

  // Walk back day by day. new Date(y, m, d - 1) (not "minus 24h") so a
  // daylight-saving change, when a day is 23 or 25 hours, can't skip or repeat a day.
  const stepBack = (key: number) => {
    const d = new Date(key);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).getTime();
  };

  let cursor = days.has(today) ? today : stepBack(today);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = stepBack(cursor);
  }
  return streak;
}

/** Start of the current week (Monday 00:00 local, the ISO week convention). */
export function startOfWeek(now: Date): Date {
  const daysSinceMonday = (now.getDay() + 6) % 7; // getDay(): Sunday = 0
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
}

/** Workouts started this week (Monday onward, up to now). */
export function workoutsThisWeek(startedAts: string[], now: Date): number {
  const from = startOfWeek(now).getTime();
  return startedAts.filter((iso) => {
    const t = new Date(iso).getTime();
    return t >= from && t <= now.getTime() + DAY_MS; // small allowance for clock skew
  }).length;
}

/** "Good morning" / "Good afternoon" / "Good evening" from the local hour. */
export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
