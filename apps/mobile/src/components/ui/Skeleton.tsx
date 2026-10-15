import { useEffect } from "react";
import { View, type DimensionValue } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { makeStyles, useTheme } from "@/theme";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  circle?: boolean;
}

/**
 * A pulsing placeholder in the shape of the content that's loading.
 * Better than a spinner: the layout doesn't jump when data arrives, and the
 * screen feels faster because its structure appears instantly.
 */
export function Skeleton({ width = "100%", height = 14, radius, circle = false }: SkeletonProps) {
  const { colors, radius: r } = useTheme();
  const reduceMotion = useReducedMotion(); // respect the OS "Reduce Motion" setting
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(withTiming(0.45, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const size = circle ? { width: height, height, borderRadius: height / 2 } : { width, height, borderRadius: radius ?? r.sm };

  return <Animated.View style={[{ backgroundColor: colors.skeleton }, size, animatedStyle]} />;
}

/** Skeleton for a workout card (feed / history / profile lists). */
export function WorkoutCardSkeleton({ showAuthor = false }: { showAuthor?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.card} accessibilityLabel="Loading workout" accessibilityRole="progressbar">
      {showAuthor ? (
        <View style={styles.row}>
          <Skeleton circle height={36} />
          <View style={styles.flex}>
            <Skeleton width="40%" height={12} />
            <Skeleton width="25%" height={10} />
          </View>
        </View>
      ) : null}
      <Skeleton width="60%" height={18} />
      <Skeleton width="85%" height={12} />
      <View style={styles.row}>
        <Skeleton width={56} height={28} />
        <Skeleton width={56} height={28} />
        <Skeleton width={72} height={28} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: t.spacing.lg, gap: t.spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: t.spacing.md },
  flex: { flex: 1, gap: t.spacing.xs + 2 },
}));
