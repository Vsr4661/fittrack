import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Badge, EmptyState, ErrorState, SearchField, Skeleton } from "@/components/ui";
import { useWorkoutDraft } from "@/features/workouts/draftStore";
import { useExercises } from "@/features/workouts/hooks";
import type { MuscleGroup } from "@/features/workouts/types";
import { haptics } from "@/lib/haptics";
import { makeStyles, MIN_TOUCH, useTheme } from "@/theme";

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
  const styles = useStyles();
  const { colors } = useTheme();
  const exercises = useExercises();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (exercises.data ?? [])
      // The logger records weight × reps; cardio (time/distance) sets come later
      .filter((e) => e.muscleGroup !== "CARDIO")
      .filter((e) => q === "" || e.name.toLowerCase().includes(q));
  }, [exercises.data, search]);

  if (exercises.isError) return <ErrorState error={exercises.error} onRetry={() => exercises.refetch()} />;

  return (
    <View style={styles.screen}>
      <View style={styles.searchBar}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Search exercises" accessibilityLabel="Search exercises" />
      </View>

      {exercises.isPending ? (
        <View style={styles.list}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.row}>
              <View style={styles.text}>
                <Skeleton width="55%" height={16} />
              </View>
              <Skeleton width={64} height={20} radius={999} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => {
                haptics.selection();
                useWorkoutDraft.getState().addExercise({ id: item.id, name: item.name, muscleGroup: item.muscleGroup });
                router.back();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Add ${item.name}, ${muscleLabel[item.muscleGroup]}`}
            >
              <Text style={[styles.name, styles.text]} numberOfLines={2}>
                {item.name}
              </Text>
              <Badge label={muscleLabel[item.muscleGroup]} />
              <Ionicons name="add-circle-outline" size={22} color={colors.primaryText} />
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState icon="search-outline" title="No exercises found" message={`Nothing matches "${search.trim()}". Try a shorter search, like "press" or "row".`} />
          }
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  searchBar: { padding: t.spacing.lg, paddingBottom: t.spacing.sm },
  list: { paddingHorizontal: t.spacing.lg, paddingBottom: t.spacing.xxl, flexGrow: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: t.spacing.md, minHeight: MIN_TOUCH + 12, paddingVertical: t.spacing.sm },
  pressed: { opacity: 0.6 },
  text: { flex: 1 },
  name: { ...t.typography.bodyStrong, color: t.colors.text },
  separator: { height: 1, backgroundColor: t.colors.border },
}));
