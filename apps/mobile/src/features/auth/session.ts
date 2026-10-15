import axios, { isAxiosError } from "axios";
import { env } from "@/config/env";
import { queryClient } from "@/lib/queryClient";
import { tokenStorage } from "@/lib/tokenStorage";
import { useAuthStore } from "@/stores/authStore";
import type { AuthResponse, AuthTokens } from "./types";

export const meQueryKey = ["me"] as const;

// A bare client with NO interceptors for refresh/logout. If these went through
// the main `api` client, a 401 from /auth/refresh would trigger another refresh: infinite loop.
export const authClient = axios.create({ baseURL: env.EXPO_PUBLIC_API_URL, timeout: 10_000 });

/** After login/register: persist the refresh token and mark the user signed in. */
export async function startSession({ user, accessToken, refreshToken }: AuthResponse) {
  await tokenStorage.setRefreshToken(refreshToken);
  queryClient.setQueryData(meQueryKey, user); // the response already has the user: skip a /me round-trip
  useAuthStore.getState().signIn(accessToken);
}

/**
 * Sign out locally first (instant, works offline), then tell the server
 * best-effort. Clearing the query cache stops the next user seeing old data.
 */
export async function endSession({ notifyServer = true } = {}) {
  const refreshToken = await tokenStorage.getRefreshToken();
  await tokenStorage.clear();
  useAuthStore.getState().clear(); // status -> signedOut: the router guard redirects to login
  queryClient.clear();

  if (notifyServer && refreshToken) {
    authClient.post("/auth/logout", { refreshToken }).catch(() => {
      // Ignore: the session is already gone locally, and the token expires anyway
    });
  }
}

let inFlightRefresh: Promise<string | null> | null = null;

/**
 * Single-flight refresh: if 5 requests hit a 401 at the same moment, they all
 * await the SAME refresh call. Otherwise 5 parallel refreshes would race, and
 * the server's rotation would reject 4 of them (or flag them as token reuse).
 */
export function refreshAccessToken(): Promise<string | null> {
  inFlightRefresh ??= doRefresh().finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
}

async function doRefresh(): Promise<string | null> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) {
    await endSession({ notifyServer: false });
    return null;
  }

  try {
    const { data } = await authClient.post<AuthTokens>("/auth/refresh", { refreshToken });
    await tokenStorage.setRefreshToken(data.refreshToken); // rotation: the old one is now dead
    useAuthStore.getState().setAccessToken(data.accessToken);
    return data.accessToken;
  } catch (err) {
    // Only a definite "no" from the server (401) ends the session. A network
    // error or 5xx keeps it, so a flaky connection doesn't log people out.
    if (isAxiosError(err) && err.response?.status === 401) {
      await endSession({ notifyServer: false });
    }
    return null;
  }
}

/** On app launch: turn a stored refresh token back into a live session. */
export async function restoreSession() {
  const hasRefreshToken = (await tokenStorage.getRefreshToken()) !== null;
  if (!hasRefreshToken) {
    useAuthStore.getState().setStatus("signedOut");
    return;
  }

  await refreshAccessToken();
  const { status, setStatus } = useAuthStore.getState();
  // If refresh got a 401, endSession already set "signedOut". If it failed for
  // network reasons we still have a refresh token, so stay signed in (offline)
  // and let the next request retry the refresh.
  if (status === "loading") setStatus("signedIn");
}
