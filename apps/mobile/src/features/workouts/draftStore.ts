import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultWorkoutTitle, parseKgToGrams, parseReps } from "./format";
import type { Exercise, Visibility, WorkoutInput } from "./types";

// Inputs are kept as the strings the user typed ("82,5", ""), and only converted
// to numbers when saving. Converting on every keystroke would fight the user,
// e.g. turning "82." into 82 before they can type the 5.
export interface DraftSet {
  key: string;
  reps: string;
  weightKg: string;
  isWarmup: boolean;
  /** Ticked off in the gym. Client-only UI state: never sent to the API. */
  done: boolean;
}

export interface DraftExercise {
  key: string; // stable React key: the same exercise can appear twice in one workout
  exercise: Pick<Exercise, "id" | "name" | "muscleGroup">;
  sets: DraftSet[];
}

export interface WorkoutDraft {
  title: string;
  visibility: Visibility;
  startedAt: string;
  exercises: DraftExercise[];
}

interface DraftState {
  draft: WorkoutDraft | null;
  start: () => void;
  setTitle: (title: string) => void;
  setVisibility: (visibility: Visibility) => void;
  addExercise: (exercise: DraftExercise["exercise"]) => void;
  removeExercise: (exerciseKey: string) => void;
  addSet: (exerciseKey: string) => void;
  updateSet: (exerciseKey: string, setKey: string, patch: Partial<Omit<DraftSet, "key">>) => void;
  removeSet: (exerciseKey: string, setKey: string) => void;
  discard: () => void;
}

let keySeq = 0;
const newKey = () => `${Date.now().toString(36)}-${(keySeq++).toString(36)}`;
const emptySet = (): DraftSet => ({ key: newKey(), reps: "", weightKg: "", isWarmup: false, done: false });

/** Immutable update of one exercise inside the draft. */
function mapExercise(draft: WorkoutDraft, exerciseKey: string, fn: (e: DraftExercise) => DraftExercise): WorkoutDraft {
  return { ...draft, exercises: draft.exercises.map((e) => (e.key === exerciseKey ? fn(e) : e)) };
}

export const useWorkoutDraft = create<DraftState>()(
  persist(
    (set, get) => {
      // Every action is a no-op when there's no draft, so callers never need to check
      const update = (fn: (draft: WorkoutDraft) => WorkoutDraft) => {
        const { draft } = get();
        if (draft) set({ draft: fn(draft) });
      };

      return {
        draft: null,

        start: () => {
          if (get().draft) return; // never clobber a workout already in progress
          set({
            draft: { title: defaultWorkoutTitle(), visibility: "PUBLIC", startedAt: new Date().toISOString(), exercises: [] },
          });
        },

        setTitle: (title) => update((d) => ({ ...d, title })),

        setVisibility: (visibility) => update((d) => ({ ...d, visibility })),

        addExercise: (exercise) =>
          update((d) => ({ ...d, exercises: [...d.exercises, { key: newKey(), exercise, sets: [emptySet()] }] })),

        removeExercise: (exerciseKey) =>
          update((d) => ({ ...d, exercises: d.exercises.filter((e) => e.key !== exerciseKey) })),

        // New sets copy the previous one: lifters usually repeat the same weight
        addSet: (exerciseKey) =>
          update((d) =>
            mapExercise(d, exerciseKey, (e) => {
              const last = e.sets.at(-1);
              const next = last ? { ...last, key: newKey(), isWarmup: false, done: false } : emptySet();
              return { ...e, sets: [...e.sets, next] };
            }),
          ),

        updateSet: (exerciseKey, setKey, patch) =>
          update((d) =>
            mapExercise(d, exerciseKey, (e) => ({
              ...e,
              sets: e.sets.map((s) => (s.key === setKey ? { ...s, ...patch } : s)),
            })),
          ),

        removeSet: (exerciseKey, setKey) =>
          update((d) => mapExercise(d, exerciseKey, (e) => ({ ...e, sets: e.sets.filter((s) => s.key !== setKey) }))),

        discard: () => set({ draft: null }),
      };
    },
    {
      name: "fittrack.workoutDraft",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ draft: state.draft }), // persist data, not functions
      // Bump `version` whenever the saved shape changes, and upgrade old data in
      // `migrate`. A draft saved by an older app version must still load.
      version: 2,
      migrate: migrateDraft,
    },
  ),
);

/**
 * Upgrades a draft saved by an older app version, one step at a time, so a
 * draft from ANY old version reaches the current shape:
 *   v0 -> v1: no `visibility` (Phase 4)    -> default PUBLIC, as the server does
 *   v1 -> v2: sets had no `done` flag       -> false
 */
export function migrateDraft(persisted: unknown, version: number): { draft: WorkoutDraft | null } {
  // Old shapes are untyped by definition, so treat them loosely and build the new one
  type Loose = { draft: (Record<string, unknown> & { exercises?: { sets?: Record<string, unknown>[] }[] }) | null };
  const state = (persisted ?? { draft: null }) as Loose;
  let draft = state.draft;

  if (draft && version < 1) {
    draft = { ...draft, visibility: draft.visibility ?? "PUBLIC" };
  }
  if (draft && version < 2) {
    draft = {
      ...draft,
      exercises: (draft.exercises ?? []).map((e) => ({ ...e, sets: (e.sets ?? []).map((set) => ({ ...set, done: false })) })),
    };
  }
  return { draft: draft as unknown as WorkoutDraft | null };
}

export type DraftResult = { ok: true; input: WorkoutInput } | { ok: false; error: string };

/**
 * Validates the draft and converts it to the API payload. Blank rows are
 * skipped (people often add one set too many); bad numbers are reported.
 */
export function draftToInput(draft: WorkoutDraft, endedAt: Date = new Date()): DraftResult {
  if (!draft.title.trim()) return { ok: false, error: "Give your workout a name." };
  if (draft.exercises.length === 0) return { ok: false, error: "Add at least one exercise." };

  const exercises: WorkoutInput["exercises"] = [];
  for (const { exercise, sets } of draft.exercises) {
    const parsedSets: WorkoutInput["exercises"][number]["sets"] = [];

    for (const [i, set] of sets.entries()) {
      if (set.reps.trim() === "" && set.weightKg.trim() === "") continue; // untouched row
      const reps = parseReps(set.reps);
      if (reps === null || reps === 0) {
        return { ok: false, error: `${exercise.name}, set ${i + 1}: enter the number of reps.` };
      }
      const weightGrams = set.weightKg.trim() === "" ? undefined : parseKgToGrams(set.weightKg);
      if (weightGrams === null) {
        return { ok: false, error: `${exercise.name}, set ${i + 1}: "${set.weightKg}" isn't a valid weight.` };
      }
      parsedSets.push({ reps, ...(weightGrams !== undefined && { weightGrams }), isWarmup: set.isWarmup });
    }

    if (parsedSets.length === 0) {
      return { ok: false, error: `Log at least one set for ${exercise.name}, or remove it.` };
    }
    exercises.push({ exerciseId: exercise.id, sets: parsedSets });
  }

  return {
    ok: true,
    input: {
      title: draft.title.trim(),
      visibility: draft.visibility,
      startedAt: draft.startedAt,
      endedAt: endedAt.toISOString(),
      exercises,
    },
  };
}
