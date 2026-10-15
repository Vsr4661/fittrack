import { router } from "expo-router";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { Avatar } from "@/components/ui";
import { makeStyles, MIN_TOUCH, textScale } from "@/theme";
import type { LeaderboardEntry, LeaderboardMetric } from "../types";
import { formatMetric } from "./WeeklyBarChart";

/** Rank 4 and below (or everyone, when there are fewer than 3). Your own row is highlighted. */
export function LeaderboardRow({ entry, metric }: { entry: LeaderboardEntry; metric: LeaderboardMetric }) {
  const styles = useStyles();
  const value = formatMetric(metric, metric === "volume" ? entry.volumeGrams : entry.workouts);
  // At large text sizes the value moves under the name, so the name isn't cut to "Sam…"
  const stacked = useWindowDimensions().fontScale > textScale.chrome;

  return (
    // A plain Pressable, not <Link asChild>: Link's Slot drops a style *function*,
    // which collapsed this row into a column
    <Pressable
      onPress={() => router.push(`/user/${entry.user.username}`)}
      style={({ pressed }) => [styles.row, entry.isMe && styles.rowMe, pressed && styles.pressed]}
      accessibilityRole="link"
      accessibilityLabel={`Rank ${entry.rank}: ${entry.isMe ? "you" : entry.user.displayName}, ${value}`}
    >
      <Text style={styles.rank} maxFontSizeMultiplier={textScale.chrome}>
        {entry.rank}
      </Text>
      <Avatar name={entry.user.displayName} userId={entry.user.id} size={40} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={stacked ? 2 : 1}>
          {entry.isMe ? "You" : entry.user.displayName}
        </Text>
        <Text style={styles.username} numberOfLines={1}>
          @{entry.user.username}
        </Text>
        {stacked ? (
          <Text style={styles.value} maxFontSizeMultiplier={textScale.numeric}>
            {value}
          </Text>
        ) : null}
      </View>
      {stacked ? null : (
        <Text style={styles.value} maxFontSizeMultiplier={textScale.numeric}>
          {value}
        </Text>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.md,
    minHeight: MIN_TOUCH + 16,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.md,
  },
  rowMe: { backgroundColor: t.colors.primarySoft },
  pressed: { opacity: 0.6 },
  rank: { ...t.typography.number, minWidth: 28, textAlign: "center", color: t.colors.textMuted },
  text: { flex: 1 },
  name: { ...t.typography.bodyStrong, color: t.colors.text },
  username: { ...t.typography.caption, color: t.colors.textMuted },
  value: { ...t.typography.number, fontSize: 16, color: t.colors.text },
}));
