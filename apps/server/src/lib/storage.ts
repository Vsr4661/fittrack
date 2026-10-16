import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env.js";

// Object storage behind pre-signed URLs: the phone uploads and downloads
// photo bytes directly, so they never pass through (or slow down) the API.
// The bucket is PRIVATE; every read needs a short-lived signed link, which the
// server only hands out after the normal visibility check.

const UPLOAD_URL_TTL_S = 5 * 60; // long enough for a slow mobile upload, short enough to be useless if leaked
export const DOWNLOAD_URL_TTL_S = 60 * 60;

const baseConfig: S3ClientConfig = {
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
  // Since SDK v3.729 every request gets a CRC32 checksum by default. A
  // pre-signed URL is signed before the body exists, so it would carry the
  // checksum of an EMPTY body and every real upload would fail (BadDigest).
  requestChecksumCalculation: "WHEN_REQUIRED",
};

/** Server -> storage calls (HEAD, DELETE). */
export const s3 = new S3Client({ ...baseConfig, endpoint: env.S3_ENDPOINT });

// Signing is pure math (no network), so a second client whose only job is to
// put the phone-reachable host into links costs nothing
const signer = new S3Client({ ...baseConfig, endpoint: env.S3_PUBLIC_ENDPOINT ?? env.S3_ENDPOINT });

/**
 * A PUT link that only accepts exactly this content type and byte size:
 * both are part of the signature, so storage rejects anything else (403).
 */
export async function presignUpload(input: { key: string; contentType: string; size: number }) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: input.key,
    ContentType: input.contentType,
    ContentLength: input.size,
  });
  const url = await getSignedUrl(signer, command, {
    expiresIn: UPLOAD_URL_TTL_S,
    // Content-Length is signed by default; Content-Type only when asked to
    signableHeaders: new Set(["content-type"]),
  });
  return { url, expiresIn: UPLOAD_URL_TTL_S };
}

export function presignDownload(key: string) {
  return getSignedUrl(signer, new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), {
    expiresIn: DOWNLOAD_URL_TTL_S,
  });
}

/** What storage actually holds under `key` (null if nothing). Never trust the client's word. */
export async function headObject(key: string): Promise<{ size: number; contentType: string | undefined } | null> {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
    return { size: head.ContentLength ?? 0, contentType: head.ContentType };
  } catch (err) {
    if (err instanceof S3ServiceException && err.$metadata.httpStatusCode === 404) return null;
    throw err;
  }
}

/** Idempotent: deleting a missing key succeeds, so a retried cleanup is safe. */
export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}
