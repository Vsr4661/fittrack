/**
 * THE definition of training volume: Σ reps × weight over WORKING sets
 * (warmups excluded). Workout cards, progress charts and the leaderboard all
 * use this one function, so the same workout can never show two volumes.
 */
export interface VolumeSet {
  reps: number | null;
  weightGrams: number | null;
  isWarmup: boolean;
}

/** The set fields volume needs, for Prisma `select`s. */
export const volumeSetSelect = { reps: true, weightGrams: true, isWarmup: true } as const;

export function workingSets<T extends { isWarmup: boolean }>(sets: T[]): T[] {
  return sets.filter((s) => !s.isWarmup);
}

/** Σ distance over working sets: cardio's counterpart to volume (a run has no kg). */
export function distanceMeters(sets: { distanceM: number | null; isWarmup: boolean }[]): number {
  return workingSets(sets).reduce((sum, s) => sum + (s.distanceM ?? 0), 0);
}

export function volumeGrams(sets: VolumeSet[]): number {
  return workingSets(sets).reduce((sum, s) => sum + (s.reps ?? 0) * (s.weightGrams ?? 0), 0);
}
