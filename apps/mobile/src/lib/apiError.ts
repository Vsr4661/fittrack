import { isAxiosError } from "axios";
import { z } from "zod";

// Mirrors the server's error shape: { error: { code, message, details? } }
const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z
      .object({ fieldErrors: z.record(z.string(), z.array(z.string())).optional() })
      .optional(),
  }),
});

export interface ApiError {
  code: string;
  message: string;
  fieldErrors: Record<string, string[]>;
}

/** Turns any thrown value into something safe to show the user. */
export function toApiError(err: unknown): ApiError {
  if (isAxiosError(err)) {
    const parsed = apiErrorSchema.safeParse(err.response?.data);
    if (parsed.success) {
      const { code, message, details } = parsed.data.error;
      return { code, message, fieldErrors: details?.fieldErrors ?? {} };
    }
    if (!err.response) {
      return { code: "NETWORK_ERROR", message: "Can't reach the server. Check your connection.", fieldErrors: {} };
    }
  }
  return { code: "UNKNOWN", message: "Something went wrong. Please try again.", fieldErrors: {} };
}
