import { useEffect, type ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { textScale, useTheme } from "@/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** 0..1, clamped. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Rendered in the middle of the ring (e.g. "2/4"). */
  children?: ReactNode;
  accessibilityLabel: string;
  /** Animation length per change. Short (e.g. 250) for a live countdown. */
  durationMs?: number;
  color?: string;
}

/**
 * A circular progress indicator that animates from empty to its value.
 *
 * How: the ring is a circle stroke with a dash as long as the circumference;
 * strokeDashoffset hides part of it. Animating the offset on the UI thread
 * (Reanimated) "draws" the ring without re-rendering React every frame.
 */
export function ProgressRing({ progress, size = 96, strokeWidth = 10, children, accessibilityLabel, durationMs = 900, color }: ProgressRingProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  // Grow with the user's text size (up to the numeric cap), so the number in
  // the middle never spills outside the ring at large Dynamic Type sizes
  const { fontScale } = useWindowDimensions();
  const ringSize = Math.round(size * Math.min(Math.max(fontScale, 1), textScale.numeric));
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));

  const animated = useSharedValue(reduceMotion ? clamped : 0);
  useEffect(() => {
    animated.value = reduceMotion ? clamped : withTiming(clamped, { duration: durationMs, easing: Easing.out(Easing.cubic) });
  }, [animated, clamped, reduceMotion, durationMs]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - animated.value) }));

  return (
    <View
      style={{ width: ringSize, height: ringSize, alignItems: "center", justifyContent: "center" }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      {/* rotate(-90): start the ring at 12 o'clock instead of 3 o'clock */}
      <Svg width={ringSize} height={ringSize} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={ringSize / 2} cy={ringSize / 2} r={radius} stroke={colors.surfaceMuted} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={ringSize / 2}
          cy={ringSize / 2}
          r={radius}
          stroke={color ?? colors.brand} // graphics, not text: the bright brand orange is fine here (3:1 rule)
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}
