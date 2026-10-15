import { api } from "@/lib/api";
import type { LoginInput, RegisterInput } from "./schemas";
import type { AuthResponse, User } from "./types";

export const authApi = {
  login: async (input: LoginInput) => (await api.post<AuthResponse>("/auth/login", input)).data,
  register: async (input: RegisterInput) =>
    (await api.post<AuthResponse>("/auth/register", input)).data,
  me: async () => (await api.get<{ user: User }>("/users/me")).data.user,
};
