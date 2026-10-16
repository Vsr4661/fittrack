import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Card, Photo } from "@/components/ui";
import { AuthorRow } from "@/features/social/components/AuthorRow";
import { LikeButton } from "@/features/social/components/LikeButton";
import { makeStyles, textScale, useTheme } from "@/theme";
import { formatDuration, formatWorkoutDate, loadStat } from "../format";
import type { WorkoutSummary } from "../types";

interface WorkoutCardProps {
  workout: WorkoutSummary;
  /** Feed shows who did it; my own history doesn't need to. */
  showAuthor?: boolean;
}

export function WorkoutCard({ workout, showAuthor = false }: WorkoutCardProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { stats, social } = workout;
  const open = () => router.push(`/workout/${workout.id}`);
  const [cover] = workout.photos;
  const photoNote = workout.photos.length > 0 ? `, ${workout.photos.length} ${workout.photos.length === 1 ? "photo" : "photos"}` : "";

  return (
    <Card onPress={open} accessibilityLabel={`${workout.title}, ${formatWorkoutDate(workout.startedAt)}${photoNote}`}>
      {showAuthor ? <AuthorRow author={workout.author} subtitle={formatWorkoutDate(workout.startedAt)} /> : null}

      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {workout.title}
        </Text>
        {workout.visibility !== "PUBLIC" ? (
          <Ionicons
            name={workout.visibility === "PRIVATE" ? "lock-closed" : "people"}
            size={14}
            color={colors.textMuted}
            accessibilityLabel={workout.visibility === "PRIVATE" ? "Private" : "Followers only"}
          />
        ) : null}
        {!showAuthor ? <Text style={styles.date}>{formatWorkoutDate(workout.startedAt)}</Text> : null}
      </View>

      <Text style={styles.exercises} numberOfLines={2}>
        {workout.exerciseNames.join(" · ")}
      </Text>

      {/* The first photo as a cover; the rest are on the detail screen */}
      {cover ? (
        <View>
          <Photo uri={cover.url} cacheKey={cover.key} style={styles.cover} />
          {workout.photos.length > 1 ? (
            <View style={styles.more}>
              <Text style={styles.moreText} maxFontSizeMultiplier={textScale.chrome}>
                +{workout.photos.length - 1}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Stat tiles: the numbers people scan for, big and tabular */}
      <View style={styles.stats}>
        {stats.durationSec !== null ? <Stat icon="time-outline" value={formatDuration(stats.durationSec)} label="Time" /> : null}
        <Stat icon="layers-outline" value={String(stats.setCount)} label="Sets" />
        <Stat icon={loadStat(stats).icon} value={loadStat(stats).value} label={loadStat(stats).label} />
      </View>

      <View style={styles.footer}>
        <LikeButton workoutId={workout.id} social={social} />
        <Pressable onPress={open} hitSlop={10} style={styles.comments} accessibilityRole="button" accessibilityLabel={`${social.commentCount} comments`}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textMuted} />
          <Text style={styles.count}>{social.commentCount}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  header: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
  title: { ...t.typography.heading, color: t.colors.text, flex: 1 },
  date: { ...t.typography.caption, color: t.colors.textMuted },
  exercises: { ...t.typography.body, fontSize: 14, color: t.colors.textMuted, marginTop: -t.spacing.xs },
  cover: { width: "100%", aspectRatio: 16 / 10, borderRadius: t.radius.md },
  more: {
    position: "absolute",
    right: t.spacing.sm,
    bottom: t.spacing.sm,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xxs,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.scrim,
  },
  moreText: { ...t.typography.label, color: t.colors.onScrim, fontVariant: ["tabular-nums"] },
  stats: { flexDirection: "row", gap: t.spacing.sm },
  stat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: t.spacing.xs + 2,
    padding: t.spacing.sm + 2,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
  },
  statValue: { ...t.typography.number, fontSize: 15, color: t.colors.text },
  statLabel: { ...t.typography.caption, fontSize: 11, color: t.colors.textMuted },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.lg,
    paddingTop: t.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
  },
  comments: { flexDirection: "row", alignItems: "center", gap: t.spacing.xs + 2, minHeight: 36 },
  count: { ...t.typography.label, color: t.colors.textMuted, fontVariant: ["tabular-nums"] },
}));
