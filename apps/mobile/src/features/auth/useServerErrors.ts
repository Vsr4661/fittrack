import { useEffect } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toApiError } from "@/lib/apiError";

/**
 * Pushes a failed mutation's server errors into the form: per-field errors
 * (from the server's Zod validation) onto their inputs, everything else
 * (409 conflict, 401, network) into `root` for a banner above the button.
 */
export function useServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
) {
  useEffect(() => {
    if (!error) return;
    const apiError = toApiError(error);

    let matchedField = false;
    for (const field of fields) {
      const message = apiError.fieldErrors[field]?.[0];
      if (message) {
        setError(field, { type: "server", message });
        matchedField = true;
      }
    }
    if (!matchedField) setError("root", { type: "server", message: apiError.message });
  }, [error, setError, fields]);
}
