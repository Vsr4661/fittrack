import { randomUUID } from "node:crypto";
import type { UploadKind } from "../../generated/prisma/client.js";
import { logger } from "../../lib/logger.js";
import { prisma, type Tx } from "../../lib/prisma.js";
import { deleteObject, headObject, presignUpload } from "../../lib/storage.js";
import { AppError } from "../../utils/AppError.js";
import { IMAGE_TYPES, type CreateUploadInput } from "./uploads.schemas.js";

// Two-step upload: (1) the server hands out a link for a key IT chose and
// records it here as pending; (2) the client attaches the key to something
// (a workout, its avatar), which "consumes" the pending row. A key you didn't
// get from step 1 can never be attached, so nobody can claim another user's file.

const MAX_PENDING_PER_USER = 20; // caps how much unattached storage one account can hold
export const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000;

const PREFIX: Record<UploadKind, string> = { WORKOUT_PHOTO: "workout-photos", AVATAR: "avatars" };

export async function createUpload(userId: string, input: CreateUploadInput) {
  const pending = await prisma.upload.count({ where: { userId } });
  if (pending >= MAX_PENDING_PER_USER) {
    throw new AppError(429, "Too many unfinished uploads, try again later", "TOO_MANY_PENDING_UPLOADS");
  }

  // userId in the path makes ownership visible in storage and lets a whole
  // account's files be found by prefix; the UUID makes keys unguessable
  const key = `${PREFIX[input.kind]}/${userId}/${randomUUID()}.${IMAGE_TYPES[input.contentType]}`;
  await prisma.upload.create({
    data: { key, userId, kind: input.kind, contentType: input.contentType, sizeBytes: input.size },
  });
  const { url, expiresIn } = await presignUpload({ key, contentType: input.contentType, size: input.size });

  // The client must send exactly this header: Content-Type is part of the signature
  return { key, uploadUrl: url, method: "PUT" as const, headers: { "Content-Type": input.contentType }, expiresIn };
}

/**
 * Checks, BEFORE a transaction, that every key is a pending upload of this
 * user and kind, and that the file really arrived in storage. (Network calls
 * stay outside transactions so a slow storage call never holds DB locks.)
 */
export async function assertUploaded(userId: string, kind: UploadKind, keys: string[]) {
  if (keys.length === 0) return;
  const found = await prisma.upload.count({ where: { key: { in: keys }, userId, kind } });
  if (found !== keys.length) throw AppError.badRequest("Photo not found, or already used");

  const heads = await Promise.all(keys.map((key) => headObject(key)));
  if (heads.some((h) => h === null)) throw AppError.badRequest("A photo hasn't finished uploading");
}

/**
 * Marks uploads as attached, inside the caller's transaction. The count check
 * makes it race-safe: if two requests try to attach the same upload, only one
 * deletes the row, and the other's whole transaction rolls back.
 */
export async function consumeUploads(tx: Tx, userId: string, keys: string[]) {
  if (keys.length === 0) return;
  const { count } = await tx.upload.deleteMany({ where: { key: { in: keys }, userId } });
  if (count !== keys.length) throw AppError.conflict("Photo already used");
}

/** After a commit: remove files nothing points at any more. Failures are logged, never thrown. */
export function deleteObjectsLater(keys: string[]) {
  for (const key of keys) {
    deleteObject(key).catch((err) => logger.error({ err, key }, "Failed to delete stored object"));
  }
}

/**
 * Deletes uploads that were never attached (and their files). Safe to run
 * on several servers at once: deletes are idempotent.
 */
// `remove` is injectable so a test can simulate storage failing
export async function sweepStaleUploads(now = Date.now(), remove = deleteObject) {
  const stale = await prisma.upload.findMany({
    where: { createdAt: { lt: new Date(now - STALE_UPLOAD_MS) } },
    select: { key: true },
    take: 500, // bounded batches; the next run picks up the rest
  });
  const results = await Promise.allSettled(stale.map((u) => remove(u.key)));
  // Only forget rows whose file is really gone, so a failed delete is retried next run
  const deleted = stale.filter((_, i) => results[i]?.status === "fulfilled").map((u) => u.key);
  await prisma.upload.deleteMany({ where: { key: { in: deleted } } });
  return deleted.length;
}
