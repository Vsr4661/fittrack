import type { PersonalRecord } from "@/features/stats/types";
import { bucketByWeek, chartWeekStarts, newRecordsFrom } from "@/features/stats/weeks";

// Local-time dates, so the tests mean the same thing in any timezone
// (npm test runs in America/Los_Angeles, which has a DST change on 1 Nov 2026)
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString();
const NOW = new Date(2026, 10, 12, 18, 0); // Thu 12 Nov 2026, after the DST change

describe("chartWeekStarts", () => {
  it("returns Monday-midnight week starts, oldest first, ending this week", () => {
    const weeks = chartWeekStarts(NOW, 3);
    expect(weeks.map((d) => [d.getMonth() + 1, d.getDate(), d.getDay(), d.getHours()])).toEqual([
      [10, 26, 1, 0], // spans the 1 Nov DST change...
      [11, 2, 1, 0], // ...and every start is still Monday 00:00 local
      [11, 9, 1, 0],
    ]);
  });
});

describe("bucketByWeek", () => {
  const s = (startedAt: string, volumeGrams: number) => ({ id: startedAt, startedAt, setCount: 1, volumeGrams });

  it("groups sessions into their week and keeps empty weeks as zeros", () => {
    const weeks = chartWeekStarts(NOW, 3);
    const buckets = bucketByWeek([s(at(2026, 10, 27), 1000), s(at(2026, 11, 1, 23), 500), s(at(2026, 11, 10), 2000)], weeks);

    expect(buckets.map((b) => [b.workouts, b.volumeGrams])).toEqual([
      [2, 1500], // Tue 27 Oct + Sun 1 Nov 23:00 (still that week, despite the DST change)
      [0, 0],
      [1, 2000],
    ]);
  });

  it("puts a session at exactly Monday 00:00 in the new week", () => {
    const weeks = chartWeekStarts(NOW, 2);
    const buckets = bucketByWeek([s(weeks[1]!.toISOString(), 100)], weeks);
    expect(buckets.map((b) => b.workouts)).toEqual([0, 1]);
  });
});

describe("newRecordsFrom", () => {
  const pr = (workoutId: string, sessionCount: number, name = "Bench Press"): PersonalRecord => ({
    exercise: { id: name, name, muscleGroup: "CHEST" },
    weightGrams: 100_000,
    reps: 5,
    workoutId,
    achievedAt: at(2026, 11, 12),
    sessionCount,
  });

  it("celebrates records this workout set, except first-ever sessions", () => {
    const records = [pr("w1", 4), pr("w1", 1, "Squat"), pr("w0", 3, "Deadlift")];
    expect(newRecordsFrom("w1", records).map((r) => r.exercise.name)).toEqual(["Bench Press"]);
  });

  it("is empty when the workout set no records", () => {
    expect(newRecordsFrom("w9", [pr("w1", 4)])).toEqual([]);
  });
});
