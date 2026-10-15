import { useEffect, useState } from "react";
import { Text, type TextStyle } from "react-native";
import { formatClock } from "../format";

/**
 * A live stopwatch. Derived from startedAt (not by counting ticks), so it stays
 * correct after the app was backgrounded, and only this tiny component
 * re-renders every second, not the whole workout screen.
 */
export function ElapsedTime({ startedAt, style, maxFontSizeMultiplier }: { startedAt: string; style?: TextStyle; maxFontSizeMultiplier?: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedSec = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  return (
    <Text style={style} maxFontSizeMultiplier={maxFontSizeMultiplier}>
      {formatClock(elapsedSec)}
    </Text>
  );
}
