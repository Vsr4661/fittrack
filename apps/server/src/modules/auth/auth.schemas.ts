import { z } from "zod";

const email = z.email().trim().toLowerCase().max(254);

// Usernames live in URLs (/users/:username), so words used by static routes
// (/users/me, /users/search) or likely future ones can't be taken.
const RESERVED_USERNAMES = new Set(["me", "search", "admin", "api", "settings", "support", "fittrack"]);

export const registerSchema = z.object({
  email,
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Only letters, numbers and underscores")
    .refine((u) => !RESERVED_USERNAMES.has(u), "This username is reserved"),
  // Max length stops someone making the server hash a 10MB "password"
  password: z.string().min(8).max(128),
  displayName: z.string().trim().min(1).max(50),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
