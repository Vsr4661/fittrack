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

export function workingSets<T extends VolumeSet>(sets: T[]): T[] {
  return sets.filter((s) => !s.isWarmup);
}

export function volumeGrams(sets: VolumeSet[]): number {
  return workingSets(sets).reduce((sum, s) => sum + (s.reps ?? 0) * (s.weightGrams ?? 0), 0);
}
