// Pure display helpers: the API stores exact integers (grams, seconds), the UI
// shows human units. Keeping conversion in one place avoids rounding drift.

/** "82.5" or "82,5" (comma-decimal locales) -> 82500. Returns null if not a valid weight. */
export function parseKgToGrams(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (normalized === "") return null;
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 1000);
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
