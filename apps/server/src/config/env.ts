import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  CORS_ORIGINS: z
    .string()
    .default("*")
    .transform((value) => value.split(",").map((origin) => origin.trim())),

  // HS256 needs a key at least as long as the hash output (256 bits = 32 bytes)
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "must be at least 32 characters")
    .refine((s) => !s.startsWith("change-me"), "is still the .env.example placeholder"),
  // Short-lived on purpose: a stolen access token is only useful until it expires
  JWT_ACCESS_TTL: z.string().regex(/^\d+[smhd]$/, "must look like 15m, 1h, 7d").default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // Object storage (photos). Any S3-compatible service: SeaweedFS locally, AWS
  // S3 in production (leave S3_ENDPOINT unset and the SDK uses AWS's own).
  S3_ENDPOINT: z.url().optional(),
  // The host baked into pre-signed links, which the PHONE opens. Differs from
  // S3_ENDPOINT when the server and phone reach storage differently (e.g. a
  // physical phone needs your Mac's LAN IP, not localhost). Defaults to S3_ENDPOINT.
  S3_PUBLIC_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_BUCKET: z.string().min(3),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  // Path-style (host/bucket/key) for local services that have no per-bucket DNS
  S3_FORCE_PATH_STYLE: z.stringbool().default(false),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:\n" + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
