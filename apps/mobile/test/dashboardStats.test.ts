import { computeStreak, greeting, startOfWeek, workoutsThisWeek } from "@/features/dashboard/stats";

// Build local-time dates explicitly, so tests pass in any timezone
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).toISOString();
const NOW = new Date(2026, 9, 15, 18, 0); // Thu 15 Oct 2026, 18:00 local

describe("computeStreak", () => {
  it("is 0 with no workouts", () => {
    expect(computeStreak([], NOW)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(computeStreak([at(2026, 10, 15), at(2026, 10, 14), at(2026, 10, 13)], NOW)).toBe(3);
  });

  it("still counts a streak that ended yesterday (you haven't trained YET today)", () => {
    expect(computeStreak([at(2026, 10, 14), at(2026, 10, 13)], NOW)).toBe(2);
  });

  it("resets after a fully missed day", () => {
    expect(computeStreak([at(2026, 10, 13), at(2026, 10, 12)], NOW)).toBe(0);
  });

  it("stops at the first gap", () => {
    expect(computeStreak([at(2026, 10, 15), at(2026, 10, 14), at(2026, 10, 12), at(2026, 10, 11)], NOW)).toBe(2);
  });

  it("counts two workouts on the same day once", () => {
    expect(computeStreak([at(2026, 10, 15, 7), at(2026, 10, 15, 19), at(2026, 10, 14)], NOW)).toBe(2);
  });

  it("uses local days: 23:30 counts for that evening, 00:15 for the next day", () => {
    expect(computeStreak([at(2026, 10, 14, 23, 30), at(2026, 10, 15, 0, 15)], NOW)).toBe(2);
  });

  it("survives a daylight-saving change (a 25-hour day)", () => {
    // US clocks fall back on Sun 1 Nov 2026; run with TZ=America/Los_Angeles to exercise it
    const now = new Date(2026, 10, 2, 9); // Mon 2 Nov
    expect(computeStreak([at(2026, 11, 2), at(2026, 11, 1), at(2026, 10, 31)], now)).toBe(3);
  });

  it("walks across month boundaries", () => {
    const now = new Date(2026, 10, 1, 9); // 1 Nov
    expect(computeStreak([at(2026, 11, 1), at(2026, 10, 31), at(2026, 10, 30)], now)).toBe(3);
  });
});

describe("startOfWeek / workoutsThisWeek", () => {
  it("weeks start on Monday", () => {
    expect(startOfWeek(NOW)).toEqual(new Date(2026, 9, 12)); // Mon 12 Oct
    expect(startOfWeek(new Date(2026, 9, 18, 10))).toEqual(new Date(2026, 9, 12)); // Sunday -> same week
    expect(startOfWeek(new Date(2026, 9, 12, 0, 5))).toEqual(new Date(2026, 9, 12)); // Monday itself
  });

  it("counts only workouts since Monday", () => {
    const isos = [at(2026, 10, 15), at(2026, 10, 12, 6), at(2026, 10, 11, 20), at(2026, 10, 5)];
    expect(workoutsThisWeek(isos, NOW)).toBe(2); // Thu + Mon; Sunday 11th was last week
  });
});

describe("greeting", () => {
  it.each([
    [3, "Up late"],
    [8, "Good morning"],
    [13, "Good afternoon"],
    [20, "Good evening"],
  ])("at %i:00 says %s", (hour, text) => {
    expect(greeting(new Date(2026, 9, 15, hour))).toBe(text);
  });
});
