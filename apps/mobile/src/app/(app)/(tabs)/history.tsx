import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { WorkoutList } from "@/features/workouts/components/WorkoutList";
import { useWorkoutDraft } from "@/features/workouts/draftStore";
import { useWorkoutHistory } from "@/features/workouts/hooks";
import { colors, spacing } from "@/theme/legacy";

export default function WorkoutHistoryScreen() {
  const history = useWorkoutHistory();
  const hasDraft = useWorkoutDraft((s) => s.draft !== null);

  const startOrResume = () => {
    useWorkoutDraft.getState().start(); // no-op if one is already in progress
    router.push("/workout/new");
  };

  return (
    <View style={styles.container}>
      <WorkoutList
        query={history}
        empty={<EmptyState title="No workouts yet" message="Start your first workout and it will show up here." />}
      />
      <View style={styles.cta}>
        <Button title={hasDraft ? "Resume workout" : "Start workout"} onPress={startOrResume} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  cta: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
