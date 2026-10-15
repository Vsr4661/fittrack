import { defineConfig } from "prisma/config";

// Prisma 7 no longer auto-loads .env. Node's built-in loader replaces `dotenv`,
// and never overrides variables that are already set (e.g. in CI or Docker).
const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
try {
  process.loadEnvFile(envFile);
} catch {
  // No env file (e.g. production) — rely on real environment variables.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Optional on purpose: `prisma generate` (run by postinstall on every fresh
    // clone / CI / Docker build) needs no database. Prisma's env() helper throws
    // when the variable is missing, which broke `npm ci` without a .env file.
    // Commands that do need a DB (migrate, studio) still fail clearly without it.
    url: process.env.DATABASE_URL,
  },
});
