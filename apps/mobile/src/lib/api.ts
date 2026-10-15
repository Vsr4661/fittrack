import axios, { isAxiosError, type InternalAxiosRequestConfig } from "axios";
import { env } from "@/config/env";
import { refreshAccessToken } from "@/features/auth/session";
import { useAuthStore } from "@/stores/authStore";

/** The client every feature uses. Auth is handled here, so features never touch tokens. */
export const api = axios.create({
  baseURL: env.EXPO_PUBLIC_API_URL,
  timeout: 10_000, // mobile networks hang; fail fast instead of spinning forever
});

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) config.headers.set("Authorization", `Bearer ${accessToken}`);
  return config;
});

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(undefined, async (error: unknown) => {
  if (!isAxiosError(error)) throw error;
  const original = error.config as RetriableConfig | undefined;

  const shouldRefresh =
    error.response?.status === 401 &&
    original !== undefined &&
    !original._retried && // retry once: a second 401 means refreshing didn't help
    // Only requests that carried a token. A 401 from /auth/login means
    // "wrong password", not "token expired": refreshing would be wrong.
    original.headers.has("Authorization");

  if (!shouldRefresh) throw error;

  original._retried = true;
  const newToken = await refreshAccessToken();
  if (!newToken) throw error;

  original.headers.set("Authorization", `Bearer ${newToken}`);
  return api(original);
});
