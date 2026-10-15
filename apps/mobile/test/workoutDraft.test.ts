import { draftToInput, migrateDraft, useWorkoutDraft, type WorkoutDraft } from "@/features/workouts/draftStore";
import {
  formatClock,
  formatDistance,
  formatDuration,
  formatVolume,
  formatWeight,
  parseDuration,
  parseKgToGrams,
  parseKmToMeters,
  parseReps,
  loadStat,
} from "@/features/workouts/format";

const bench = { id: "ex-bench", name: "Bench Press", muscleGroup: "CHEST" as const };
const squat = { id: "ex-squat", name: "Back Squat", muscleGroup: "LEGS" as const };
const run = { id: "ex-run", name: "Running", muscleGroup: "CARDIO" as const };

const store = () => useWorkoutDraft.getState();
const draft = () => {
  const d = store().draft;
  if (!d) throw new Error("expected a draft");
  return d;
};

beforeEach(() => {
  store().discard();
});

describe("unit conversion", () => {
  it.each([
    ["82.5", 82_500],
    ["82,5", 82_500], // comma-decimal locales (most of Europe)
    ["100", 100_000],
    [" 20 ", 20_000],
    ["0.125", 125],
    ["", null],
    ["abc", null],
    ["-5", null],
    ["1.2.3", null],
  ])("parseKgToGrams(%j) = %j", (input, expected) => {
    expect(parseKgToGrams(input)).toBe(expected);
  });

  it("avoids floating point drift", () => {
    // In JS, 2.01 * 1000 === 2009.9999999999998, so without rounding these would
    // be sent as non-integers and rejected by the server's z.int() check.
    expect(parseKgToGrams("2.01")).toBe(2010);
    expect(parseKgToGrams("1.005")).toBe(1005);
  });

  it.each([
    ["8", 8],
    ["", null],
    ["8.5", null],
    ["-1", null],
  ])("parseReps(%j) = %j", (input, expected) => {
    expect(parseReps(input)).toBe(expected);
  });

  it("formats for display", () => {
    expect(formatWeight(82_500)).toBe("82.5 kg");
    expect(formatWeight(80_000)).toBe("80 kg");
    expect(formatVolume(2_340_500)).toBe("2,341 kg");
    expect(formatDuration(3725)).toBe("1h 2m");
    expect(formatDuration(540)).toBe("9m");
    expect(formatClock(754)).toBe("12:34");
    expect(formatClock(3725)).toBe("1:02:05");
  });
});

describe("workout draft store", () => {
  it("starts a draft once and never overwrites one in progress", () => {
    store().start();
    store().setTitle("Push day");
    store().start();

    expect(draft().title).toBe("Push day");
  });

  it("adds an exercise with one empty set ready to fill in", () => {
    store().start();
    store().addExercise(bench);

    expect(draft().exercises).toHaveLength(1);
    expect(draft().exercises[0]!.sets).toEqual([expect.objectContaining({ reps: "", weightKg: "" })]);
  });

  it("copies the previous set's values when adding a set (but not warmup)", () => {
    store().start();
    store().addExercise(bench);
    const ex = draft().exercises[0]!;
    store().updateSet(ex.key, ex.sets[0]!.key, { reps: "8", weightKg: "80", isWarmup: true });

    store().addSet(ex.key);

    const [first, second] = draft().exercises[0]!.sets;
    expect(second).toMatchObject({ reps: "8", weightKg: "80", isWarmup: false });
    expect(second!.key).not.toBe(first!.key);
  });

  it("only touches the targeted exercise and set", () => {
    store().start();
    store().addExercise(bench);
    store().addExercise(bench); // same exercise twice is allowed
    const [a, b] = draft().exercises;

    store().updateSet(a!.key, a!.sets[0]!.key, { reps: "5" });
    store().removeExercise(b!.key);

    expect(draft().exercises).toHaveLength(1);
    expect(draft().exercises[0]!.sets[0]!.reps).toBe("5");
  });

  it("ignores edits when there is no draft (no crash after discard)", () => {
    store().setTitle("ghost");
    store().addExercise(bench);

    expect(store().draft).toBeNull();
  });
});

describe("draftToInput (validation + API payload)", () => {
  const baseDraft = (exercises: WorkoutDraft["exercises"]): WorkoutDraft => ({
    title: "  Push day  ",
    visibility: "FOLLOWERS",
    startedAt: "2026-10-15T10:00:00.000Z",
    exercises,
  });
  const set = (reps: string, weightKg: string, isWarmup = false, done = false) => ({ key: Math.random().toString(), reps, weightKg, distanceKm: "", duration: "", isWarmup, done });
  const cardio = (distanceKm: string, duration: string, isWarmup = false) => ({ key: Math.random().toString(), reps: "", weightKg: "", distanceKm, duration, isWarmup, done: false });

  it("sends cardio sets as distance + duration, and skips blank cardio rows", () => {
    const result = draftToInput(baseDraft([{ key: "r", exercise: run, sets: [cardio("1", "8", true), cardio("5,2", "28:30"), cardio("", "")] }]));

    expect(result.ok && result.input.exercises[0]!.sets).toEqual([
      { distanceM: 1000, durationSec: 480, isWarmup: true },
      { distanceM: 5200, durationSec: 1710, isWarmup: false },
    ]);
  });

  it("accepts cardio with only a distance or only a time", () => {
    const result = draftToInput(baseDraft([{ key: "r", exercise: run, sets: [cardio("3", ""), cardio("", "1:05:00")] }]));

    expect(result.ok && result.input.exercises[0]!.sets).toEqual([
      { distanceM: 3000, isWarmup: false },
      { durationSec: 3900, isWarmup: false },
    ]);
  });

  it("rejects bad cardio values with a message naming the set", () => {
    expect(draftToInput(baseDraft([{ key: "r", exercise: run, sets: [cardio("five", "")] }]))).toEqual({
      ok: false,
      error: 'Running, set 1: "five" isn\'t a valid distance in km.',
    });
    expect(draftToInput(baseDraft([{ key: "r", exercise: run, sets: [cardio("", "28:75")] }]))).toMatchObject({ ok: false });
    expect(draftToInput(baseDraft([{ key: "r", exercise: run, sets: [cardio("0", "0")] }]))).toEqual({
      ok: false,
      error: "Running, set 1: enter a distance or a time.",
    });
  });

  it("converts to the API shape: trimmed title, grams, numbers, endedAt", () => {
    const result = draftToInput(
      baseDraft([
        { key: "1", exercise: bench, sets: [set("10", "40", true), set("8", "82,5")] },
        { key: "2", exercise: squat, sets: [set("12", "")] }, // bodyweight-style: no weight
      ]),
      new Date("2026-10-15T11:00:00.000Z"),
    );

    expect(result).toEqual({
      ok: true,
      input: {
        title: "Push day",
        visibility: "FOLLOWERS",
        startedAt: "2026-10-15T10:00:00.000Z",
        endedAt: "2026-10-15T11:00:00.000Z",
        exercises: [
          {
            exerciseId: "ex-bench",
            sets: [
              { reps: 10, weightGrams: 40_000, isWarmup: true },
              { reps: 8, weightGrams: 82_500, isWarmup: false },
            ],
          },
          { exerciseId: "ex-squat", sets: [{ reps: 12, isWarmup: false }] },
        ],
      },
    });
  });

  it("never sends the client-only `done` flag to the API", () => {
    const result = draftToInput(baseDraft([{ key: "1", exercise: bench, sets: [set("5", "100", false, true), set("5", "100")] }]));

    expect(result.ok && result.input.exercises[0]!.sets).toEqual([
      { reps: 5, weightGrams: 100_000, isWarmup: false },
      { reps: 5, weightGrams: 100_000, isWarmup: false },
    ]);
  });

  it("skips completely blank rows (the extra set people often add)", () => {
    const result = draftToInput(baseDraft([{ key: "1", exercise: bench, sets: [set("5", "100"), set("", "")] }]));

    expect(result.ok && result.input.exercises[0]!.sets).toHaveLength(1);
  });

  it.each([
    ["no exercises", baseDraft([]), "Add at least one exercise."],
    ["a blank title", { ...baseDraft([{ key: "1", exercise: bench, sets: [set("5", "100")] }]), title: " " }, "Give your workout a name."],
    ["weight without reps", baseDraft([{ key: "1", exercise: bench, sets: [set("", "100")] }]), "Bench Press, set 1: enter the number of reps."],
    ["zero reps", baseDraft([{ key: "1", exercise: bench, sets: [set("0", "100")] }]), "Bench Press, set 1: enter the number of reps."],
    ["a junk weight", baseDraft([{ key: "1", exercise: bench, sets: [set("5", "heavy")] }]), 'Bench Press, set 1: "heavy" isn\'t a valid weight.'],
    ["an exercise with only blank rows", baseDraft([{ key: "1", exercise: squat, sets: [set("", "")] }]), "Log at least one set for Back Squat, or remove it."],
  ])("rejects %s with a specific message", (_label, input, error) => {
    expect(draftToInput(input)).toEqual({ ok: false, error });
  });
});

describe("persisted draft migration", () => {
  it("upgrades a v0 draft (saved before visibility existed) to PUBLIC", () => {
    const v0 = { draft: { title: "Old", startedAt: "2026-10-15T10:00:00.000Z", exercises: [] } };

    expect(migrateDraft(v0, 0)).toEqual({ draft: { ...v0.draft, visibility: "PUBLIC" } });
  });

  it("upgrades a v1 draft: sets gain done = false, nothing else changes", () => {
    const v1 = {
      draft: {
        title: "Push",
        visibility: "PRIVATE",
        startedAt: "2026-10-15T10:00:00.000Z",
        exercises: [{ key: "e1", exercise: bench, sets: [{ key: "s1", reps: "5", weightKg: "100", isWarmup: true }] }],
      },
    };

    const migrated = migrateDraft(v1, 1);

    expect(migrated.draft?.visibility).toBe("PRIVATE"); // v1 data preserved
    // ...and the later steps run too (v3 cardio fields): every step chains to the current shape
    expect(migrated.draft?.exercises[0]!.sets[0]).toEqual({ key: "s1", reps: "5", weightKg: "100", isWarmup: true, done: false, distanceKm: "", duration: "" });
  });

  it("chains every step for a v0 draft (visibility AND done)", () => {
    const v0 = { draft: { title: "Old", startedAt: "2026-10-15T10:00:00.000Z", exercises: [{ key: "e1", exercise: bench, sets: [{ key: "s1", reps: "8", weightKg: "", isWarmup: false }] }] } };

    const migrated = migrateDraft(v0, 0);

    expect(migrated.draft).toMatchObject({ visibility: "PUBLIC", exercises: [{ sets: [{ done: false }] }] });
  });

  it("new sets start not-done, and a copied set resets done", () => {
    store().start();
    store().addExercise(bench);
    const ex = draft().exercises[0]!;
    store().updateSet(ex.key, ex.sets[0]!.key, { reps: "5", done: true });

    store().addSet(ex.key);

    expect(draft().exercises[0]!.sets.map((s) => s.done)).toEqual([true, false]);
  });

  it("upgrades a v2 draft: sets gain empty cardio fields, typed values untouched", () => {
    const v2 = { draft: { title: "Legs", visibility: "PUBLIC", startedAt: "2026-10-15T10:00:00.000Z", exercises: [{ key: "e1", exercise: squat, sets: [{ key: "s1", reps: "5", weightKg: "120", isWarmup: false, done: true }] }] } };

    expect(migrateDraft(v2, 2).draft?.exercises[0]!.sets[0]).toEqual({ key: "s1", reps: "5", weightKg: "120", isWarmup: false, done: true, distanceKm: "", duration: "" });
  });

  it("leaves an empty v0 state alone", () => {
    expect(migrateDraft({ draft: null }, 0)).toEqual({ draft: null });
  });

  it("new drafts start PUBLIC and can change visibility", () => {
    store().start();
    store().setVisibility("PRIVATE");

    expect(draft().visibility).toBe("PRIVATE");
  });
});

describe("cardio units", () => {
  it("parses km with either decimal separator", () => {
    expect(parseKmToMeters("5.2")).toBe(5200);
    expect(parseKmToMeters("10,05")).toBe(10050);
    expect(parseKmToMeters("")).toBeNull();
    expect(parseKmToMeters("5 km")).toBeNull();
  });

  it("parses minutes, min:sec and h:mm:ss", () => {
    expect(parseDuration("30")).toBe(1800);
    expect(parseDuration("28:30")).toBe(1710);
    expect(parseDuration("1:05:00")).toBe(3900);
    expect(parseDuration("28:75")).toBeNull(); // a typo, not 29:15
    expect(parseDuration("1:5")).toBeNull();
    expect(parseDuration("")).toBeNull();
  });

  it("formats distances", () => {
    expect(formatDistance(800)).toBe("800 m");
    expect(formatDistance(5200)).toBe("5.2 km");
  });

  it("shows distance instead of '0 kg' for a pure-cardio workout, volume otherwise", () => {
    expect(loadStat({ totalVolumeGrams: 0, totalDistanceM: 5200 })).toMatchObject({ label: "Distance", value: "5.2 km" });
    expect(loadStat({ totalVolumeGrams: 640_000, totalDistanceM: 2000 })).toMatchObject({ label: "Volume", value: "640 kg" });
    expect(loadStat({ totalVolumeGrams: 0, totalDistanceM: 0 })).toMatchObject({ label: "Volume", value: "0 kg" });
  });
});
