import { useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { useTheme } from "@/theme";

const PIECES = 40;
const DURATION_MS = 2200;

interface Piece {
  x: number; // start x as a fraction of the screen width
  drift: number; // horizontal sway, in points
  delay: number; // fraction of the timeline before it starts falling
  spin: number; // full turns over the fall
  size: number;
  color: string;
  round: boolean;
}

/**
 * A one-shot confetti burst for real milestones (a new personal record).
 * Built on Reanimated instead of a Lottie file: no extra package, and it uses
 * theme colors, so it matches light and dark mode.
 *
 * ONE shared value (0 → 1) drives every piece; each piece derives its own
 * position from it on the UI thread, so 40 pieces cost one animation.
 * Purely decorative: hidden from screen readers, never blocks touches, and
 * not rendered at all under Reduce Motion (the screen still says what happened).
 */
export function Confetti() {
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  // Random per mount, stable across re-renders
  const pieces = useMemo<Piece[]>(() => {
    const palette = [colors.brand, colors.primary, colors.success, colors.warning, colors.primaryText];
    return Array.from({ length: PIECES }, (_, i) => ({
      x: Math.random(),
      drift: (Math.random() - 0.5) * 120,
      delay: Math.random() * 0.25,
      spin: 1 + Math.random() * 3,
      size: 6 + Math.random() * 6,
      color: palette[i % palette.length]!,
      round: Math.random() < 0.3,
    }));
  }, [colors]);

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withTiming(1, { duration: DURATION_MS, easing: Easing.linear });
  }, [progress, reduceMotion]);

  if (reduceMotion) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} piece={p} progress={progress} width={width} height={height} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece, progress, width, height }: { piece: Piece; progress: SharedValue<number>; width: number; height: number }) {
  const style = useAnimatedStyle(() => {
    // This piece's own 0 → 1, starting after its delay
    const t = Math.min(1, Math.max(0, (progress.value - piece.delay) / (1 - piece.delay)));
    const fall = t * t; // accelerate like gravity
    return {
      opacity: t === 0 ? 0 : 1 - Math.max(0, (t - 0.75) / 0.25), // fade out over the last quarter
      transform: [
        { translateX: piece.x * width + Math.sin(t * Math.PI * 2) * piece.drift * 0.5 + piece.drift * t },
        { translateY: -20 + fall * (height + 40) },
        { rotate: `${piece.spin * 360 * t}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { width: piece.size, height: piece.round ? piece.size : piece.size * 0.45, backgroundColor: piece.color, borderRadius: piece.round ? piece.size / 2 : 1 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: { position: "absolute", left: 0, top: 0 },
});
