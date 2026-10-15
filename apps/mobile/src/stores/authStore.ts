import { create } from "zustand";

export type AuthStatus = "loading" | "signedIn" | "signedOut";

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  signIn: (accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  setStatus: (status: AuthStatus) => void;
  clear: () => void;
}

// Client/session state only. Server data (the user profile, workouts...) lives
// in TanStack Query's cache, so it's never duplicated or out of sync here.
export const useAuthStore = create<AuthState>()((set) => ({
  status: "loading",
  accessToken: null,
  signIn: (accessToken) => set({ status: "signedIn", accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setStatus: (status) => set({ status }),
  clear: () => set({ status: "signedOut", accessToken: null }),
}));
