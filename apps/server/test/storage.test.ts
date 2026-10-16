import { afterAll, describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import { deleteObject, headObject, presignDownload, presignUpload, s3 } from "../src/lib/storage.js";

// Real object storage (SeaweedFS in docker-compose / CI), not a mock: what
// matters here is what STORAGE accepts or rejects for a signed link.

const jpeg = new Uint8Array(1000).fill(7);
const newKey = () => `test/${randomUUID()}.jpg`;

async function upload(key: string, body = jpeg, contentType = "image/jpeg") {
  const { url } = await presignUpload({ key, contentType: "image/jpeg", size: jpeg.byteLength });
  return fetch(url, { method: "PUT", body, headers: { "Content-Type": contentType } });
}

afterAll(() => s3.destroy());

describe("pre-signed uploads", () => {
  it("accepts the exact type and size it was signed for", async () => {
    const key = newKey();
    const res = await upload(key);

    expect(res.status).toBe(200);
    expect(await headObject(key)).toEqual({ size: 1000, contentType: "image/jpeg" });
  });

  it("rejects a body of a different size than was signed", async () => {
    const key = newKey();
    const res = await upload(key, new Uint8Array(5000));

    expect(res.status).toBe(403);
    expect(await headObject(key)).toBeNull();
  });

  it("rejects a different content type than was signed (no HTML disguised as a photo)", async () => {
    const key = newKey();
    const res = await upload(key, jpeg, "text/html");

    expect(res.status).toBe(403);
    expect(await headObject(key)).toBeNull();
  });
});

describe("downloads", () => {
  it("serves an object through a signed link", async () => {
    const key = newKey();
    expect((await upload(key)).status).toBe(200);

    const res = await fetch(await presignDownload(key));

    expect(res.status).toBe(200);
    expect((await res.arrayBuffer()).byteLength).toBe(1000);
  });

  it("refuses unsigned reads: the bucket is private", async () => {
    const key = newKey();
    expect((await upload(key)).status).toBe(200); // so a 403 below means "private", not "missing"

    const signed = new URL(await presignDownload(key));
    const res = await fetch(signed.origin + signed.pathname);

    expect(res.status).toBe(403);
  });
});

describe("headObject / deleteObject", () => {
  it("returns null for a missing key", async () => {
    expect(await headObject(newKey())).toBeNull();
  });

  it("deletes, and deleting again is a no-op", async () => {
    const key = newKey();
    expect((await upload(key)).status).toBe(200);

    await deleteObject(key);
    await deleteObject(key);

    expect(await headObject(key)).toBeNull();
  });
});
