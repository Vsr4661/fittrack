import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "./api";
import { endSession, meQueryKey, startSession } from "./session";

export function useLogin() {
  return useMutation({ mutationFn: authApi.login, onSuccess: startSession });
}

export function useRegister() {
  return useMutation({ mutationFn: authApi.register, onSuccess: startSession });
}

export function useLogout() {
  return useMutation({ mutationFn: () => endSession() });
}

/** The signed-in user. Seeded by login/register, refetched from /users/me otherwise. */
export function useMe() {
  const status = useAuthStore((s) => s.status);
  return useQuery({ queryKey: meQueryKey, queryFn: authApi.me, enabled: status === "signedIn" });
}
