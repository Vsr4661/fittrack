import { create } from "zustand";

export const DEFAULT_REST_SEC = 90;
const MAX_REST_SEC = 10 * 60;

interface RestTimerState {
  /** Epoch ms when the rest ends; null = no timer running. */
  endsAt: number | null;
  /** Total length of the current rest, for the ring's progress. */
  durationSec: number;
  start: (sec?: number) => void;
  /** -15s / +15s buttons. Never goes below "now" or above 10 minutes. */
  adjust: (deltaSec: number) => void;
  stop: () => void;
}

/**
 * Stores WHEN the rest ends, not a countdown that ticks. A ticking counter
 * freezes when the phone locks or the app is backgrounded between sets;
 * an end time stays correct, because "remaining" is just endsAt - now.
 */
export const useRestTimer = create<RestTimerState>()((set, get) => ({
  endsAt: null,
  durationSec: DEFAULT_REST_SEC,
  start: (sec = DEFAULT_REST_SEC) => set({ endsAt: Date.now() + sec * 1000, durationSec: sec }),
  adjust: (deltaSec) => {
    const { endsAt, durationSec } = get();
    if (endsAt === null) return;
    const now = Date.now();
    const nextEnd = Math.min(endsAt + deltaSec * 1000, now + MAX_REST_SEC * 1000);
    if (nextEnd <= now) {
      set({ endsAt: null }); // -15s past zero just ends the rest
      return;
    }
    set({ endsAt: nextEnd, durationSec: Math.max(1, durationSec + deltaSec) });
  },
  stop: () => set({ endsAt: null }),
}));

/** Whole seconds left, never negative. Pure, for display and tests. */
export function remainingSec(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}
