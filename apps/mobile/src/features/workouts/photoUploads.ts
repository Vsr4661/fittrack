import { create } from "zustand";
import { uploadImage } from "@/features/uploads/uploadImage";
import { useWorkoutDraft, type DraftPhoto } from "./draftStore";

// Upload PROGRESS lives here, deliberately apart from the persisted draft:
// an upload in flight can't survive the app being killed, so persisting
// "uploading 40%" would be a lie on the next launch. What survives is the
// draft's photo list; resumePendingUploads() restarts anything without a key.

export type PhotoUploadStatus = { state: "uploading"; progress: number } | { state: "failed" };

interface PhotoUploadsState {
  byId: Record<string, PhotoUploadStatus>;
}

export const usePhotoUploads = create<PhotoUploadsState>(() => ({ byId: {} }));

const setStatus = (id: string, status: PhotoUploadStatus | null) =>
  usePhotoUploads.setState(({ byId }) => {
    const next = { ...byId };
    if (status) next[id] = status;
    else delete next[id];
    return { byId: next };
  });

/** Starts (or retries) one photo's upload. A no-op while it's already uploading. */
export async function startPhotoUpload(photo: DraftPhoto) {
  if (usePhotoUploads.getState().byId[photo.id]?.state === "uploading") return;
  setStatus(photo.id, { state: "uploading", progress: 0 });
  try {
    const key = await uploadImage(photo.uri, "WORKOUT_PHOTO", {
      onProgress: (progress) => setStatus(photo.id, { state: "uploading", progress }),
    });
    // If the photo was removed (or the draft discarded) meanwhile, this is a
    // no-op, and the server sweeps the unattached upload after a day
    useWorkoutDraft.getState().setPhotoKey(photo.id, key);
    setStatus(photo.id, null);
  } catch {
    setStatus(photo.id, { state: "failed" });
  }
}

/** After a relaunch: upload every draft photo that has no key and isn't in flight. */
export function resumePendingUploads() {
  const photos = useWorkoutDraft.getState().draft?.photos ?? [];
  for (const photo of photos) {
    if (photo.key === null && !usePhotoUploads.getState().byId[photo.id]) void startPhotoUpload(photo);
  }
}

/** What "Finish workout" must wait for. */
export function pendingPhotoState(photos: DraftPhoto[]) {
  const { byId } = usePhotoUploads.getState();
  const unfinished = photos.filter((p) => p.key === null);
  return {
    uploading: unfinished.filter((p) => byId[p.id]?.state !== "failed").length,
    failed: unfinished.filter((p) => byId[p.id]?.state === "failed"),
  };
}
