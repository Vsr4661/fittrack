import { z } from "zod";

// Same rules as the server, for instant feedback while typing. The server is
// still the authority: it re-validates everything, since a client can be bypassed.

export const loginSchema = z.object({
  email: z.email("Enter a valid email").trim(),
  password: z.string().min(1, "Enter your password"),
});

export const registerSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name").max(50),
  username: z
    .string()
    .trim()
    .min(3, "At least 3 characters")
    .max(30, "At most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores"),
  email: z.email("Enter a valid email").trim(),
  password: z.string().min(8, "At least 8 characters").max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
