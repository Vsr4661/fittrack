import { z } from "zod";

const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.url(),
});

// Expo inlines EXPO_PUBLIC_* values at build time by find-and-replace, so each
// one must be referenced literally (`process.env.EXPO_PUBLIC_X`). Passing
// `process.env` as a whole object would give you an empty object in the app.
export const env = envSchema.parse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
});
