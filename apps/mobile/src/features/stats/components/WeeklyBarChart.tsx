import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { formatVolume } from "@/features/workouts/format";
import { makeStyles, textScale } from "@/theme";
import type { LeaderboardMetric } from "../types";
import type { WeekBucket } from "../weeks";

const CHART_HEIGHT = 140;
const LABEL_EVERY = 4; // date label under every 4th week; the last one reads "Now"

const shortDate = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
export const formatMetric = (metric: LeaderboardMetric, value: number) =>
  metric === "volume" ? formatVolume(value) : `${value} workout${value === 1 ? "" : "s"}`;

/**
 * Weekly bars built from plain Views: flexbox lays them out, so there's no
 * chart library (and nothing to explain but flexbox). Bars grow with a
 * transform (scaleY from the bottom edge), which animates on the UI thread
 * without re-running layout every frame.
 */
export function WeeklyBarChart({ buckets, metric }: { buckets: WeekBucket[]; metric: LeaderboardMetric }) {
  const styles = useStyles();
  const values = buckets.map((b) => (metric === "volume" ? b.volumeGrams : b.workouts));
  const max = Math.max(...values, 0);
  const bestIndex = values.indexOf(max);
  const current = values[values.length - 1] ?? 0;

  // The chart is one element for screen readers, with the numbers spelled out
  const summary =
    `Weekly ${metric === "volume" ? "volume" : "workouts"}, last ${buckets.length} weeks. ` +
    `This week ${formatMetric(metric, current)}.` +
    (max > 0 ? ` Best week ${formatMetric(metric, max)}, week of ${shortDate(buckets[bestIndex]!.weekStart)}.` : "");

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary}>
      <View style={styles.plot}>
        {values.map((v, i) => (
          // key includes the metric: switching metric remounts the bars, so they grow again
          <Bar key={`${metric}-${i}`} index={i} fraction={max > 0 ? v / max : 0} isCurrent={i === values.length - 1} />
        ))}
      </View>
      <View style={styles.axis}>
        {buckets.map((b, i) => {
          const isLast = i === buckets.length - 1;
          const show = isLast || (buckets.length - 1 - i) % LABEL_EVERY === 0;
          return (
            // The label is wider than one bar slot; centered on its bar, it
            // overflows into the neighbouring (unlabelled) slots instead of truncating
            <View key={i} style={styles.labelSlot}>
              {show ? (
                <Text style={[styles.axisLabel, isLast && styles.axisLabelCurrent]} numberOfLines={1} maxFontSizeMultiplier={textScale.chrome}>
                  {isLast ? "Now" : shortDate(b.weekStart)}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Bar({ index, fraction, isCurrent }: { index: number; fraction: number; isCurrent: boolean }) {
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const grow = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    // Left to right, 30ms apart: the eye reads the trend as it draws
    grow.value = withDelay(index * 30, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [grow, index, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scaleY: grow.value }] }));
  // Empty weeks keep a short stub: a gap in training is information, not missing data
  const height = fraction > 0 ? Math.max(4, fraction * CHART_HEIGHT) : 3;

  return (
    <View style={styles.slot}>
      <Animated.View style={[styles.bar, { height }, fraction > 0 ? (isCurrent ? styles.barCurrent : styles.barPast) : styles.barEmpty, animated]} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  plot: {
    height: CHART_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: t.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  slot: { flex: 1, height: "100%", justifyContent: "flex-end" },
  bar: { borderTopLeftRadius: t.radius.sm / 2, borderTopRightRadius: t.radius.sm / 2, transformOrigin: "bottom" },
  // Bars are graphics people must read, so each fill passes 3:1 (WCAG 1.4.11).
  // Only THIS week is orange (the Effort rule); past weeks are solid slate.
  // A faded orange would have read as "past" but measured under 3:1.
  barCurrent: { backgroundColor: t.colors.brand },
  barPast: { backgroundColor: t.colors.textMuted },
  barEmpty: { backgroundColor: t.colors.surfaceMuted },
  axis: { flexDirection: "row", gap: t.spacing.xs, marginTop: t.spacing.xs },
  labelSlot: { flex: 1, alignItems: "center", overflow: "visible" },
  axisLabel: { width: 64, ...t.typography.caption, fontSize: 11, color: t.colors.textMuted, textAlign: "center" },
  axisLabelCurrent: { color: t.colors.text, fontFamily: t.typography.label.fontFamily },
}));
