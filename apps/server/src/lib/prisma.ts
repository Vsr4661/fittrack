import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

// One client (and one connection pool) for the whole process.
// Creating a client per request would exhaust Postgres connections fast.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

const base = new PrismaClient({
  adapter,
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

/** The stable link for an avatar key (served by media.routes.ts, which redirects to storage). */
export function avatarUrlFor(avatarKey: string | null): string | null {
  return avatarKey ? `${env.PUBLIC_API_URL}/api/v1/media/${avatarKey}` : null;
}

// `avatarUrl` is computed from the stored `avatarKey` on every read, including
// nested ones (workout -> user), so the ~10 places that select a user keep
// selecting `avatarUrl: true` and none of them has to know about storage.
export const prisma = base.$extends({
  result: {
    user: {
      avatarUrl: {
        needs: { avatarKey: true },
        compute: (user) => avatarUrlFor(user.avatarKey),
      },
    },
  },
});

/** The client inside `prisma.$transaction(async (tx) => ...)`, extensions included. */
export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
