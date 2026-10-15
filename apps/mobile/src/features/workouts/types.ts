// Mirrors the server's workout responses (workouts.service.ts).

export type MuscleGroup = "CHEST" | "BACK" | "LEGS" | "SHOULDERS" | "ARMS" | "CORE" | "FULL_BODY" | "CARDIO";
export type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
}

export interface WorkoutStats {
  exerciseCount: number;
  setCount: number;
  totalVolumeGrams: number;
  durationSec: number | null;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  reps: number | null;
  weightGrams: number | null;
  durationSec: number | null;
  distanceM: number | null;
  isWarmup: boolean;
}

export interface WorkoutDetail {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  visibility: Visibility;
  startedAt: string;
  endedAt: string | null;
  stats: WorkoutStats;
  exercises: { id: string; position: number; notes: string | null; exercise: Exercise; sets: WorkoutSet[] }[];
}

export interface WorkoutSummary {
  id: string;
  title: string;
  visibility: Visibility;
  startedAt: string;
  endedAt: string | null;
  exerciseNames: string[];
  stats: WorkoutStats;
}

export interface WorkoutPage {
  items: WorkoutSummary[];
  nextCursor: string | null;
}

/** Request body for POST /workouts. */
export interface WorkoutInput {
  title: string;
  startedAt: string;
  endedAt?: string;
  visibility?: Visibility;
  exercises: { exerciseId: string; sets: { reps?: number; weightGrams?: number; isWarmup?: boolean }[] }[];
}
