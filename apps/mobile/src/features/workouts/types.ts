// Mirrors the server's workout responses (workouts.service.ts).

export type MuscleGroup = "CHEST" | "BACK" | "LEGS" | "SHOULDERS" | "ARMS" | "CORE" | "FULL_BODY" | "CARDIO";
export type Visibility = "PUBLIC" | "FOLLOWERS" | "PRIVATE";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
}

export interface Author {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface WorkoutSocial {
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface WorkoutStats {
  exerciseCount: number;
  setCount: number;
  totalVolumeGrams: number;
  /** Working-set distance: cardio's counterpart to volume. */
  totalDistanceM: number;
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

/** `url` is a short-lived signed link; `key` is stable (use it as the image cache key). */
export interface WorkoutPhoto {
  id: string;
  key: string;
  url: string;
}

export interface WorkoutDetail {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  visibility: Visibility;
  startedAt: string;
  endedAt: string | null;
  author: Author;
  stats: WorkoutStats;
  social: WorkoutSocial;
  photos: WorkoutPhoto[];
  exercises: { id: string; position: number; notes: string | null; exercise: Exercise; sets: WorkoutSet[] }[];
}

export interface WorkoutSummary {
  id: string;
  title: string;
  visibility: Visibility;
  startedAt: string;
  endedAt: string | null;
  author: Author;
  exerciseNames: string[];
  photos: WorkoutPhoto[];
  stats: WorkoutStats;
  social: WorkoutSocial;
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
  visibility: Visibility;
  exercises: {
    exerciseId: string;
    sets: { reps?: number; weightGrams?: number; durationSec?: number; distanceM?: number; isWarmup?: boolean }[];
  }[];  /** Keys from POST /uploads, in display order. */
  photoKeys?: string[];
}
