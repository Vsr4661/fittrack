import { create } from "zustand";

/**
 * "Someone you follow posted": a client-only UI flag (Zustand holds client
 * state, never server data). The Feed shows a pill instead of inserting
 * the new workout, so the list never jumps under the user's thumb.
 */
export const useFeedUpdates = create<{ hasNew: boolean; setHasNew: (hasNew: boolean) => void }>()((set) => ({
  hasNew: false,
  setHasNew: (hasNew) => set({ hasNew }),
}));
