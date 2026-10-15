import { router } from "expo-router";
import { View } from "react-native";
import { Button, EmptyState, LargeTitle } from "@/components/ui";
import { WorkoutList } from "@/features/workouts/components/WorkoutList";
import { useWorkoutDraft } from "@/features/workouts/draftStore";
import { useWorkoutHistory } from "@/features/workouts/hooks";
import { makeStyles } from "@/theme";

export default function WorkoutHistoryScreen() {
  const styles = useStyles();
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
        header={<LargeTitle title="Workouts" />}
        empty={<EmptyState icon="barbell-outline" title="No workouts yet" message="Start your first workout and it will show up here." />}
      />
      <View style={styles.cta}>
        <Button title={hasDraft ? "Resume workout" : "Start workout"} icon={hasDraft ? "play-forward" : "play"} size="lg" onPress={startOrResume} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  cta: { padding: t.spacing.lg, borderTopWidth: 1, borderTopColor: t.colors.border, backgroundColor: t.colors.background },
}));
