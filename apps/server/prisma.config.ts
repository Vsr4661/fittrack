import { defineConfig, env } from "prisma/config";

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
    url: env("DATABASE_URL"),
  },
});
