import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AuthorRow } from "@/features/social/components/AuthorRow";
import { LikeButton } from "@/features/social/components/LikeButton";
import { colors, radius, spacing } from "@/theme/legacy";
import { formatDuration, formatVolume, formatWorkoutDate } from "../format";
import type { WorkoutSummary } from "../types";

interface WorkoutCardProps {
  workout: WorkoutSummary;
  /** Feed shows who did it; my own history doesn't need to. */
  showAuthor?: boolean;
}

export function WorkoutCard({ workout, showAuthor = false }: WorkoutCardProps) {
  const { stats, social } = workout;
  return (
    <View style={styles.card}>
      {showAuthor ? <AuthorRow author={workout.author} subtitle={formatWorkoutDate(workout.startedAt)} /> : null}

      <Link href={`/workout/${workout.id}`} asChild>
        <Pressable style={({ pressed }) => [styles.body, pressed && styles.pressed]} accessibilityRole="button">
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {workout.title}
            </Text>
            {!showAuthor ? <Text style={styles.date}>{formatWorkoutDate(workout.startedAt)}</Text> : null}
            {workout.visibility !== "PUBLIC" ? (
              <Ionicons
                name={workout.visibility === "PRIVATE" ? "lock-closed" : "people"}
                size={14}
                color={colors.textMuted}
                accessibilityLabel={workout.visibility === "PRIVATE" ? "Private" : "Followers only"}
              />
            ) : null}
          </View>
          <Text style={styles.exercises} numberOfLines={2}>
            {workout.exerciseNames.join(" · ")}
          </Text>
          <View style={styles.stats}>
            {stats.durationSec !== null ? <Stat label="Duration" value={formatDuration(stats.durationSec)} /> : null}
            <Stat label="Sets" value={String(stats.setCount)} />
            <Stat label="Volume" value={formatVolume(stats.totalVolumeGrams)} />
          </View>
        </Pressable>
      </Link>

      <View style={styles.footer}>
        <LikeButton workoutId={workout.id} social={social} />
        <Link href={`/workout/${workout.id}`} asChild>
          <Pressable style={styles.comments} hitSlop={8} accessibilityLabel={`${social.commentCount} comments`}>
            <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
            <Text style={styles.count}>{social.commentCount}</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  body: { gap: spacing.sm },
  pressed: { opacity: 0.7 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1, fontSize: 17, fontWeight: "700", color: colors.text },
  date: { fontSize: 13, color: colors.textMuted },
  exercises: { fontSize: 14, color: colors.textMuted },
  stats: { flexDirection: "row", gap: spacing.lg },
  statLabel: { fontSize: 12, color: colors.textMuted },
  statValue: { fontSize: 15, fontWeight: "600", color: colors.text },
  footer: {
    flexDirection: "row",
    gap: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  comments: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  count: { fontSize: 15, color: colors.textMuted, fontVariant: ["tabular-nums"] },
});
