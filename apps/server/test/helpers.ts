import type { Express } from "express";
import request from "supertest";
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

/** Registers a user through the real API and returns their access token. */
export async function registerUser(app: Express, suffix = "1") {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({
      email: `user${suffix}@example.com`,
      username: `user_${suffix}`,
      password: "correct-horse-battery",
      displayName: `User ${suffix}`,
    });
  if (res.status !== 201) throw new Error(`registerUser failed: ${JSON.stringify(res.body)}`);
  return { token: res.body.accessToken as string, userId: res.body.user.id as string };
}

/** resetState truncates exercises too (FK to users), so tests create their own catalog. */
export async function createCatalogExercises() {
  const [bench, squat, run] = await Promise.all([
    prisma.exercise.create({ data: { name: "Bench Press", muscleGroup: "CHEST", equipment: "BARBELL" } }),
    prisma.exercise.create({ data: { name: "Back Squat", muscleGroup: "LEGS", equipment: "BARBELL" } }),
    prisma.exercise.create({ data: { name: "Running", muscleGroup: "CARDIO", equipment: "OTHER" } }),
  ]);
  return { bench: bench.id, squat: squat.id, run: run.id };
}

/** Step 1 + 2 of an upload, like the phone does: get a signed link, PUT the bytes. */
export async function uploadImage(
  app: Express,
  user: { token: string },
  kind: "WORKOUT_PHOTO" | "AVATAR" = "WORKOUT_PHOTO",
  { send = true } = {}, // false = got a link but never uploaded
) {
  const body = new Uint8Array(1234).fill(1);
  const res = await request(app)
    .post("/api/v1/uploads")
    .set({ Authorization: `Bearer ${user.token}` })
    .send({ kind, contentType: "image/jpeg", size: body.byteLength });
  if (res.status !== 201) throw new Error(`upload link failed: ${JSON.stringify(res.body)}`);
  if (send) {
    const put = await fetch(res.body.uploadUrl, { method: "PUT", body, headers: res.body.headers });
    if (put.status !== 200) throw new Error(`storage PUT failed: ${put.status}`);
  }
  return res.body.key as string;
}

/** Deletes after a commit are fire-and-forget, so poll briefly instead of racing them. */
export async function eventually(check: () => Promise<boolean>, timeoutMs = 2000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return false;
}
