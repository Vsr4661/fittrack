import { api } from "@/lib/api";

// Mirrors apps/server/src/modules/uploads (POST /uploads).
export type UploadKind = "WORKOUT_PHOTO" | "AVATAR";

export interface UploadTarget {
  key: string;
  uploadUrl: string;
  method: "PUT";
  /** Must be sent exactly: Content-Type is part of the link's signature. */
  headers: Record<string, string>;
  expiresIn: number;
}

export const uploadsApi = {
  create: async (input: { kind: UploadKind; contentType: "image/jpeg"; size: number }) =>
    (await api.post<UploadTarget>("/uploads", input)).data,
};
