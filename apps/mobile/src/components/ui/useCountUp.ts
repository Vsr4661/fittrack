import { useEffect, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";

/**
 * Counts from 0 up to `target` with an ease-out curve, for stat numbers.
 * Small integers only (streaks, counts): it re-renders on each frame, which
 * is fine for one short-lived number but not for anything in a long list.
 */
export function useCountUp(target: number, durationMs = 700): number {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState(reduceMotion ? target : 0);

  useEffect(() => {
    if (reduceMotion || target === 0) {
      setValue(target);
      return;
    }
    const start = Date.now();
    let frame: number;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - (1 - t) ** 3; // ease-out cubic
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, reduceMotion]);

  return value;
}
