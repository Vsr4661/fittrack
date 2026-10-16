import { z } from "zod";

// Phones resize photos before uploading (~0.3-1 MB), so 5 MB leaves room
// for a full-quality original without letting anyone fill the bucket cheaply.
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Allowed types -> file extension. An allow-list: never trust a client's filename. */
export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
} as const;

export const createUploadSchema = z.object({
  kind: z.enum(["WORKOUT_PHOTO", "AVATAR"]),
  contentType: z.enum(Object.keys(IMAGE_TYPES) as [keyof typeof IMAGE_TYPES]),
  size: z.int().min(1).max(MAX_UPLOAD_BYTES, "Photos can be at most 5 MB"),
});

/** A key the client sends back. Shape only; ownership is checked against the uploads table. */
export const uploadKeySchema = z.string().min(1).max(200);

export type CreateUploadInput = z.infer<typeof createUploadSchema>;
