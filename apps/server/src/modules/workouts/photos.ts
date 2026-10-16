import { presignDownload } from "../../lib/storage.js";

// Photos are stored as keys and turned into short-lived signed links only
// when a workout is serialized. Serialization happens after the visibleTo
// check, so a link exists only for people allowed to see the workout.

export const photosSelect = {
  orderBy: { position: "asc" },
  select: { id: true, key: true },
} as const;

/** `key` is returned too: the owner sends it back on edit to keep the photo. */
export function withPhotoUrls(photos: { id: string; key: string }[]) {
  return Promise.all(photos.map(async (p) => ({ ...p, url: await presignDownload(p.key) })));
}
