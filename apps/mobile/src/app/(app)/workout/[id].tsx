import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { useMe } from "@/features/auth/hooks";
import { formatDuration, formatVolume, formatWeight, formatWorkoutDate } from "@/features/workouts/format";
import { useDeleteWorkout, useWorkout } from "@/features/workouts/hooks";
import type { WorkoutSet } from "@/features/workouts/types";
import { toApiError } from "@/lib/apiError";
import { colors, radius, spacing } from "@/theme";

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = useWorkout(id);
  const me = useMe();
  const deleteWorkout = useDeleteWorkout();

  if (workout.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (workout.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{toApiError(workout.error).message}</Text>
        <Button title="Try again" variant="secondary" onPress={() => workout.refetch()} />
      </View>
    );
  }

  const w = workout.data;
  const isOwner = me.data?.id === w.userId;

  const confirmDelete = () =>
    Alert.alert("Delete workout?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteWorkout.mutate(w.id, {
            onSuccess: () => router.back(),
            onError: (err) => Alert.alert("Couldn't delete", toApiError(err).message),
          }),
      },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: isOwner
            ? () => (
                <Pressable onPress={confirmDelete} hitSlop={8} accessibilityLabel="Delete workout">
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </Pressable>
              )
            : undefined,
        }}
      />

      <Text style={styles.title}>{w.title}</Text>
      <Text style={styles.muted}>{formatWorkoutDate(w.startedAt)}</Text>

      <View style={styles.stats}>
        {w.stats.durationSec !== null ? <Stat label="Duration" value={formatDuration(w.stats.durationSec)} /> : null}
        <Stat label="Volume" value={formatVolume(w.stats.totalVolumeGrams)} />
        <Stat label="Sets" value={String(w.stats.setCount)} />
      </View>

      {w.exercises.map((entry) => (
        <View key={entry.id} style={styles.exercise}>
          <Text style={styles.exerciseName}>{entry.exercise.name}</Text>
          {entry.sets.map((set) => (
            <View key={set.id} style={styles.setRow}>
              <Text style={[styles.setNumber, set.isWarmup && styles.warmup]}>
                {set.isWarmup ? "W" : set.setNumber}
              </Text>
              <Text style={styles.setText}>{describeSet(set)}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function describeSet(set: WorkoutSet): string {
  if (set.reps !== null && set.weightGrams !== null) return `${formatWeight(set.weightGrams)} × ${set.reps}`;
  if (set.reps !== null) return `${set.reps} reps`;
  if (set.durationSec !== null) return formatDuration(set.durationSec);
  return "—";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background },
  error: { color: colors.danger, fontSize: 16, textAlign: "center" },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  muted: { fontSize: 15, color: colors.textMuted, marginTop: -spacing.sm },
  stats: { flexDirection: "row", gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  exercise: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  exerciseName: { fontSize: 17, fontWeight: "700", color: colors.primary },
  setRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  setNumber: { width: 24, textAlign: "center", fontWeight: "700", color: colors.textMuted },
  warmup: { color: "#B45309" },
  setText: { fontSize: 16, color: colors.text, fontVariant: ["tabular-nums"] },
});
