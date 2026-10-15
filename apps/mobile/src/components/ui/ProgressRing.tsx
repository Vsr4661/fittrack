import { useEffect, type ReactNode } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** 0..1, clamped. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Rendered in the middle of the ring (e.g. "2/4"). */
  children?: ReactNode;
  accessibilityLabel: string;
}

/**
 * A circular progress indicator that animates from empty to its value.
 *
 * How: the ring is a circle stroke with a dash as long as the circumference;
 * strokeDashoffset hides part of it. Animating the offset on the UI thread
 * (Reanimated) "draws" the ring without re-rendering React every frame.
 */
export function ProgressRing({ progress, size = 96, strokeWidth = 10, children, accessibilityLabel }: ProgressRingProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));

  const animated = useSharedValue(reduceMotion ? clamped : 0);
  useEffect(() => {
    animated.value = reduceMotion ? clamped : withTiming(clamped, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [animated, clamped, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - animated.value) }));

  return (
    <View
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      {/* rotate(-90): start the ring at 12 o'clock instead of 3 o'clock */}
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.surfaceMuted} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.brand} // graphics, not text: the bright brand orange is fine here (3:1 rule)
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
