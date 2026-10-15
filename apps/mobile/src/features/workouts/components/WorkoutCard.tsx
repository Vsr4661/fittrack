import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/theme";
import { formatDuration, formatVolume, formatWorkoutDate } from "../format";
import type { WorkoutSummary } from "../types";

export function WorkoutCard({ workout }: { workout: WorkoutSummary }) {
  const { stats } = workout;
  return (
    <Link href={`/workout/${workout.id}`} asChild>
      <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} accessibilityRole="button">
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>
            {workout.title}
          </Text>
          <Text style={styles.date}>{formatWorkoutDate(workout.startedAt)}</Text>
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
  pressed: { opacity: 0.7 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: spacing.sm },
  title: { flex: 1, fontSize: 17, fontWeight: "700", color: colors.text },
  date: { fontSize: 13, color: colors.textMuted },
  exercises: { fontSize: 14, color: colors.textMuted },
  stats: { flexDirection: "row", gap: spacing.lg },
  statLabel: { fontSize: 12, color: colors.textMuted },
  statValue: { fontSize: 15, fontWeight: "600", color: colors.text },
});
