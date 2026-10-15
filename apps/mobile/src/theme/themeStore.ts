import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemePreference = "system" | "light" | "dark";

interface ThemePreferenceState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

/** The user's choice in Settings. "system" follows the phone's appearance. */
export const useThemePreference = create<ThemePreferenceState>()(
  persist(
    (set) => ({
      preference: "system",
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: "fittrack.themePreference",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ preference: s.preference }),
    },
  ),
);
