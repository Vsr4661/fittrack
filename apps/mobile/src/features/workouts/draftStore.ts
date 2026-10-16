import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultWorkoutTitle, isCardio, parseDuration, parseKgToGrams, parseKmToMeters, parseReps } from "./format";
import type { Exercise, Visibility, WorkoutInput } from "./types";

// Inputs are kept as the strings the user typed ("82,5", ""), and only converted
// to numbers when saving. Converting on every keystroke would fight the user,
// e.g. turning "82." into 82 before they can type the 5.
export interface DraftSet {
  key: string;
  // Strength exercises fill reps + weight; cardio fills distance + duration.
  // One shape for both keeps every store action the same for every exercise.
  reps: string;
  weightKg: string;
  distanceKm: string;
  /** As typed: "30", "28:30" or "1:05:00" (see parseDuration). */
  duration: string;
  isWarmup: boolean;
  /** Ticked off in the gym. Client-only UI state: never sent to the API. */
  done: boolean;
}

export interface DraftExercise {
  key: string; // stable React key: the same exercise can appear twice in one workout
  exercise: Pick<Exercise, "id" | "name" | "muscleGroup">;
  sets: DraftSet[];
}

/** A photo picked for this workout. `key` is set once its upload finished. */
export interface DraftPhoto {
  id: string;
  /** The resized local copy (in the app's cache), shown while logging. */
  uri: string;
  key: string | null;
}

export const MAX_PHOTOS = 4; // same limit as the server

export interface WorkoutDraft {
  title: string;
  visibility: Visibility;
  startedAt: string;
  exercises: DraftExercise[];
  photos: DraftPhoto[];
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
  /** Returns the new photos, so the caller can start their uploads. */
  addPhotos: (uris: string[]) => DraftPhoto[];
  setPhotoKey: (photoId: string, key: string) => void;
  removePhoto: (photoId: string) => void;
  discard: () => void;
}

let keySeq = 0;
const newKey = () => `${Date.now().toString(36)}-${(keySeq++).toString(36)}`;
const emptySet = (): DraftSet => ({ key: newKey(), reps: "", weightKg: "", distanceKm: "", duration: "", isWarmup: false, done: false });

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
            draft: {
              title: defaultWorkoutTitle(),
              visibility: "PUBLIC",
              startedAt: new Date().toISOString(),
              exercises: [],
              photos: [],
            },
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

        addPhotos: (uris) => {
          const draft = get().draft;
          if (!draft) return [];
          const added = uris
            .slice(0, MAX_PHOTOS - draft.photos.length)
            .map((uri) => ({ id: newKey(), uri, key: null }));
          set({ draft: { ...draft, photos: [...draft.photos, ...added] } });
          return added;
        },

        setPhotoKey: (photoId, key) =>
          update((d) => ({ ...d, photos: d.photos.map((p) => (p.id === photoId ? { ...p, key } : p)) })),

        removePhoto: (photoId) => update((d) => ({ ...d, photos: d.photos.filter((p) => p.id !== photoId) })),

        discard: () => set({ draft: null }),
      };
    },
    {
      name: "fittrack.workoutDraft",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ draft: state.draft }), // persist data, not functions
      // Bump `version` whenever the saved shape changes, and upgrade old data in
      // `migrate`. A draft saved by an older app version must still load.
      version: 4,
      migrate: migrateDraft,
    },
  ),
);

/**
 * Upgrades a draft saved by an older app version, one step at a time, so a
 * draft from ANY old version reaches the current shape:
 *   v0 -> v1: no `visibility` (Phase 4)    -> default PUBLIC, as the server does
 *   v1 -> v2: sets had no `done` flag       -> false
 *   v2 -> v3: sets had no cardio fields     -> distanceKm/duration ""
 *   v3 -> v4: no photos (Phase 7)           -> []
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
  if (draft && version < 3) {
    draft = {
      ...draft,
      exercises: (draft.exercises ?? []).map((e) => ({
        ...e,
        sets: (e.sets ?? []).map((set) => ({ ...set, distanceKm: set.distanceKm ?? "", duration: set.duration ?? "" })),
      })),
    };
  }
  if (draft && version < 4) {
    draft = { ...draft, photos: draft.photos ?? [] };
  }
  return { draft: draft as unknown as WorkoutDraft | null };
}

type ApiSet = WorkoutInput["exercises"][number]["sets"][number];

/** A cardio row -> API set; "blank" for an untouched row, or an error message. */
function parseCardioSet(set: DraftSet, where: string): ApiSet | "blank" | string {
  const distance = set.distanceKm.trim();
  const time = set.duration.trim();
  if (distance === "" && time === "") return "blank";

  const distanceM = distance === "" ? undefined : parseKmToMeters(distance);
  if (distanceM === null) return `${where}: "${set.distanceKm}" isn't a valid distance in km.`;
  const durationSec = time === "" ? undefined : parseDuration(time);
  if (durationSec === null) return `${where}: enter the time as minutes ("30") or min:sec ("28:30").`;
  // Either one is enough (a treadmill run with no distance, or a timed row), but not zeros
  if (!distanceM && !durationSec) return `${where}: enter a distance or a time.`;

  return { ...(distanceM ? { distanceM } : {}), ...(durationSec ? { durationSec } : {}), isWarmup: set.isWarmup };
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
      if (isCardio(exercise)) {
        const parsed = parseCardioSet(set, `${exercise.name}, set ${i + 1}`);
        if (parsed === "blank") continue; // untouched row
        if (typeof parsed === "string") return { ok: false, error: parsed };
        parsedSets.push(parsed);
        continue;
      }
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
      // Only finished uploads; the logger makes sure none is still pending first
      photoKeys: draft.photos.flatMap((p) => (p.key ? [p.key] : [])),
    },
  };
}
