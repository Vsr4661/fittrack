import { File, UploadTask } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { uploadsApi, type UploadKind } from "./api";

// The phone does the heavy lifting: resize + re-encode here, then send the
// bytes straight to storage. The API only signs a link (one small JSON call).

/** Long edge in px. 1600 is sharp on any phone screen at ~0.3-0.6 MB. */
const MAX_EDGE: Record<UploadKind, number> = { WORKOUT_PHOTO: 1600, AVATAR: 512 };

/**
 * Resizes and re-encodes to JPEG. Re-encoding also DROPS the EXIF metadata,
 * including GPS: a photo taken at home must not reveal where you live.
 * (The server can't do this: it never sees the bytes.)
 */
export async function prepareImage(asset: { uri: string; width: number; height: number }, kind: UploadKind) {
  const max = MAX_EDGE[kind];
  let context = ImageManipulator.manipulate(asset.uri);
  // Only shrink, never enlarge; resizing one side keeps the aspect ratio
  if (Math.max(asset.width, asset.height) > max) {
    context = context.resize(asset.width >= asset.height ? { width: max } : { height: max });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return saved.uri;
}

export class UploadError extends Error {}

/** Step 1: ask the API for a link. Step 2: PUT the file to storage. Returns the key to attach. */
export async function uploadImage(
  uri: string,
  kind: UploadKind,
  { onProgress, signal }: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
) {
  const file = new File(uri);
  // The exact byte size is signed into the link; storage rejects any other size
  const target = await uploadsApi.create({ kind, contentType: "image/jpeg", size: file.size });

  const task = new UploadTask(file, target.uploadUrl, {
    httpMethod: target.method,
    headers: target.headers,
    onProgress: ({ bytesSent, totalBytes }) => onProgress?.(totalBytes > 0 ? bytesSent / totalBytes : 0),
    signal,
  });
  const result = await task.uploadAsync();
  // Storage answers non-2xx as a normal response, not a rejection
  if (result.status < 200 || result.status >= 300) throw new UploadError(`Upload failed (${result.status})`);
  return target.key;
}
