import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/Button";
import { useWorkoutDraft } from "@/features/workouts/draftStore";
import { useExercises } from "@/features/workouts/hooks";
import type { MuscleGroup } from "@/features/workouts/types";
import { toApiError } from "@/lib/apiError";
import { colors, radius, spacing } from "@/theme";

const muscleLabel: Record<MuscleGroup, string> = {
  CHEST: "Chest",
  BACK: "Back",
  LEGS: "Legs",
  SHOULDERS: "Shoulders",
  ARMS: "Arms",
  CORE: "Core",
  FULL_BODY: "Full body",
  CARDIO: "Cardio",
};

export default function PickExerciseScreen() {
  const exercises = useExercises();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (exercises.data ?? [])
      // The logger records weight × reps; cardio (time/distance) sets come later
      .filter((e) => e.muscleGroup !== "CARDIO")
      .filter((e) => q === "" || e.name.toLowerCase().includes(q));
  }, [exercises.data, search]);

  if (exercises.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (exercises.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{toApiError(exercises.error).message}</Text>
        <Button title="Try again" variant="secondary" onPress={() => exercises.refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search exercises"
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        clearButtonMode="while-editing"
        accessibilityLabel="Search exercises"
      />
      <FlatList
        data={filtered}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => {
              useWorkoutDraft.getState().addExercise({ id: item.id, name: item.name, muscleGroup: item.muscleGroup });
              router.back();
            }}
            accessibilityRole="button"
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{muscleLabel[item.muscleGroup]}</Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No exercises match "{search}"</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background },
  error: { color: colors.danger, fontSize: 16, textAlign: "center" },
  search: {
    margin: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  row: { paddingHorizontal: spacing.md, paddingVertical: 14 },
  pressed: { backgroundColor: colors.surface },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.md },
  emptyText: { textAlign: "center", color: colors.textMuted, padding: spacing.lg },
});
