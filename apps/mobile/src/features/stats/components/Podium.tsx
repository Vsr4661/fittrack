import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import { Avatar } from "@/components/ui";
import { makeStyles, textScale, useTheme } from "@/theme";
import type { LeaderboardEntry, LeaderboardMetric } from "../types";
import { formatMetric } from "./WeeklyBarChart";

// Block heights by visual slot, not by rank: with ties (1, 1, 3) the server's
// ranks still label each block correctly, while the shape stays a podium.
const BLOCK_HEIGHT = [72, 100, 56]; // left (2nd), center (1st), right (3rd)
const ORDER = [1, 0, 2]; // which entry goes in each slot: 2nd · 1st · 3rd

/** The top three, classic podium layout. Rendered only when there are 3+ entries. */
export function Podium({ entries, metric }: { entries: LeaderboardEntry[]; metric: LeaderboardMetric }) {
  const styles = useStyles();
  return (
    <View style={styles.podium}>
      {ORDER.map((entryIndex, slot) => {
        const entry = entries[entryIndex];
        return entry ? <Step key={entry.user.id} entry={entry} slot={slot} metric={metric} /> : <View key={slot} style={styles.step} />;
      })}
    </View>
  );
}

function Step({ entry, slot, metric }: { entry: LeaderboardEntry; slot: number; metric: LeaderboardMetric }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const rise = useSharedValue(reduceMotion ? 1 : 0);
  const isCenter = slot === 1;
  const value = formatMetric(metric, metric === "volume" ? entry.volumeGrams : entry.workouts);

  useEffect(() => {
    if (reduceMotion) return;
    // 3rd, then 2nd, then 1st: the winner arrives last
    const delay = [120, 240, 0][slot]!;
    rise.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 140 }));
  }, [reduceMotion, rise, slot]);

  const blockStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: rise.value }] }));

  return (
    <View
      style={styles.step}
      accessible
      accessibilityLabel={`Rank ${entry.rank}: ${entry.isMe ? "you" : entry.user.displayName}, ${value}`}
    >
      {isCenter ? <Ionicons name="trophy" size={22} color={colors.brand} style={styles.crown} /> : null}
      <Avatar name={entry.user.displayName} userId={entry.user.id} uri={entry.user.avatarUrl} size={isCenter ? 64 : 52} ring={entry.isMe ? colors.brand : undefined} />
      <Text style={[styles.name, entry.isMe && styles.nameMe]} numberOfLines={1}>
        {entry.isMe ? "You" : entry.user.displayName.split(" ")[0]}
      </Text>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={textScale.chrome}>
        {value}
      </Text>
      <Animated.View style={[styles.block, isCenter && styles.blockCenter, { height: BLOCK_HEIGHT[slot] }, blockStyle]}>
        <Text style={[styles.rank, isCenter && styles.rankCenter]} maxFontSizeMultiplier={textScale.chrome}>
          {entry.rank}
        </Text>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  podium: { flexDirection: "row", alignItems: "flex-end", gap: t.spacing.sm, paddingTop: t.spacing.md },
  step: { flex: 1, alignItems: "center", gap: t.spacing.xs },
  crown: { marginBottom: -2 },
  name: { ...t.typography.label, color: t.colors.text, maxWidth: "100%" },
  nameMe: { color: t.colors.primaryText },
  value: { ...t.typography.caption, color: t.colors.textMuted, fontVariant: ["tabular-nums"], maxWidth: "100%" },
  block: {
    alignSelf: "stretch",
    marginTop: t.spacing.xs,
    borderTopLeftRadius: t.radius.md,
    borderTopRightRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: "center",
    paddingTop: t.spacing.sm,
    transformOrigin: "bottom",
  },
  // 1st place: the one Ember fill on the screen, carrying white text (4.59:1)
  blockCenter: { backgroundColor: t.colors.primary },
  rank: { ...t.typography.title, color: t.colors.textMuted },
  rankCenter: { color: t.colors.onPrimary },
}));
