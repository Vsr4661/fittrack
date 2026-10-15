import { useEffect, useState } from "react";

/**
 * Returns `value` only after it has stopped changing for `delayMs`.
 * Search uses it so typing "alice" sends 1 request instead of 5.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id); // a new keystroke cancels the pending update
  }, [value, delayMs]);

  return debounced;
}
