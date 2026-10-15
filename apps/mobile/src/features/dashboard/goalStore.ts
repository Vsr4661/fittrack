import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** The user's weekly workout target. A device preference, so it lives locally. */
export const useWeeklyGoal = create<{ goal: number; setGoal: (goal: number) => void }>()(
  persist(
    (set) => ({
      goal: 4,
      setGoal: (goal) => set({ goal: Math.min(7, Math.max(1, Math.round(goal))) }),
    }),
    {
      name: "fittrack.weeklyGoal",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ goal: s.goal }),
    },
  ),
);
