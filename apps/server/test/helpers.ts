import { prisma } from "../src/lib/prisma.js";
import { redis } from "../src/lib/redis.js";

/** Wipes all user data (CASCADE follows every FK) and rate-limit counters. */
export async function resetState() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users" CASCADE`);
  await redis.flushdb();
}

/** Close pools so Jest can exit without "open handles" warnings. */
export async function closeConnections() {
  await Promise.all([prisma.$disconnect(), redis.quit()]);
}

export const validUser = {
  email: "Alex@Example.com",
  username: "alex_lifts",
  password: "correct-horse-battery",
  displayName: "Alex",
};
