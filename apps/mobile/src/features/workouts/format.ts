import type { MuscleGroup } from "./types";
// Pure display helpers: the API stores exact integers (grams, seconds), the UI
// shows human units. Keeping conversion in one place avoids rounding drift.

/** "82.5" or "82,5" (comma-decimal locales) -> 82500. Returns null if not a valid weight. */
export function parseKgToGrams(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (normalized === "") return null;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 1000);
}

/** "5.2" or "5,2" km -> 5200 m. Returns null if not a valid distance. */
export function parseKmToMeters(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 1000);
}

/**
 * What people actually type for a duration, -> seconds:
 *   "30" = 30 minutes · "28:30" = 28 min 30 s · "1:05:00" = 1 h 5 min.
 * Seconds/minutes after a colon must be 00-59 ("28:75" is a typo, not 29:15).
 */
export function parseDuration(input: string): number | null {
  const t = input.trim();
  if (/^\d+$/.test(t)) return Number(t) * 60;
  const mmss = /^(\d+):([0-5]\d)$/.exec(t);
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2]);
  const hmmss = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(t);
  if (hmmss) return Number(hmmss[1]) * 3600 + Number(hmmss[2]) * 60 + Number(hmmss[3]);
  return null;
}

export function parseReps(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

/** 82500 -> "82.5 kg", 80000 -> "80 kg" */
export function formatWeight(grams: number): string {
  return `${Number((grams / 1000).toFixed(2))} kg`;
}

/** Big totals read better rounded: 2_340_500 g -> "2,341 kg" */
export function formatVolume(grams: number): string {
  return `${Math.round(grams / 1000).toLocaleString("en-US")} kg`;
}

/** 5200 -> "5.2 km", 800 -> "800 m" */
export function formatDistance(meters: number): string {
  return meters < 1000 ? `${meters} m` : `${Number((meters / 1000).toFixed(2))} km`;
}

/** Cardio exercises log distance and time; everything else logs weight and reps. */
export const isCardio = (exercise: { muscleGroup: MuscleGroup }) => exercise.muscleGroup === "CARDIO";

/**
 * The load tile for a workout: volume for lifting, distance for a pure-cardio
 * workout (a run would otherwise read "0 kg"). Mixed workouts keep volume.
 */
export function loadStat(stats: { totalVolumeGrams: number; totalDistanceM: number }) {
  return stats.totalVolumeGrams === 0 && stats.totalDistanceM > 0
    ? { label: "Distance", value: formatDistance(stats.totalDistanceM), icon: "navigate-outline" as const }
    : { label: "Volume", value: formatVolume(stats.totalVolumeGrams), icon: "barbell-outline" as const };
}

/** 3725 -> "1h 2m", 540 -> "9m", 45 -> "45s" */
export function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${totalSec}s`;
}

/** 754 -> "12:34", 3725 -> "1:02:05" (a running stopwatch) */
export function formatClock(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mmss = `${String(m).padStart(h > 0 ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

export function formatWorkoutDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

/** Default title from the time of day: "Morning workout", "Evening workout"... */
export function defaultWorkoutTitle(date: Date = new Date()): string {
  const hour = date.getHours();
  const part = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  return `${part} workout`;
}

/** Display names for muscle groups (shared by the picker, logger and PR cards). */
export const muscleLabel: Record<MuscleGroup, string> = {
  CHEST: "Chest",
  BACK: "Back",
  LEGS: "Legs",
  SHOULDERS: "Shoulders",
  ARMS: "Arms",
  CORE: "Core",
  FULL_BODY: "Full body",
  CARDIO: "Cardio",
};
