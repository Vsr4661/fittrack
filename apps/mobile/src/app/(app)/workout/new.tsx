import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, EmptyState, KeyboardScreen, toast } from "@/components/ui";
import { ElapsedTime } from "@/features/workouts/components/ElapsedTime";
import { ExerciseCard } from "@/features/workouts/components/ExerciseCard";
import { RestTimer } from "@/features/workouts/components/RestTimer";
import { VisibilityPicker } from "@/features/workouts/components/VisibilityPicker";
import { draftToInput, useWorkoutDraft } from "@/features/workouts/draftStore";
import { useCreateWorkout } from "@/features/workouts/hooks";
import { useRestTimer } from "@/features/workouts/restTimer";
import { toApiError } from "@/lib/apiError";
import { makeStyles, MIN_TOUCH, textScale, useTheme } from "@/theme";

export default function NewWorkoutScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const draft = useWorkoutDraft((s) => s.draft);
  const actions = useWorkoutDraft.getState(); // actions never change: no need to subscribe
  const createWorkout = useCreateWorkout();

  // Covers deep links / reloads straight into this screen
  useEffect(() => {
    useWorkoutDraft.getState().start();
  }, []);

  if (!draft) return null;

  const totalSets = draft.exercises.reduce((n, e) => n + e.sets.length, 0);
  const doneSets = draft.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  // ── Unchanged flow (only the feedback is now a toast instead of an alert) ──
  const finish = () => {
    const result = draftToInput(draft);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    createWorkout.mutate(result.input, {
      onSuccess: (workout) => {
        actions.discard();
        useRestTimer.getState().stop();
        toast.success("Workout saved 💪");
        // Replace (not push) so "back" from the summary goes to history, not the logger
        // celebrate=1: the detail screen checks this workout for new PRs (once, right after saving)
        router.replace({ pathname: "/workout/[id]", params: { id: workout.id, celebrate: "1" } });
      },
      onError: (err) => toast.error(toApiError(err).message),
    });
  };

  // A destructive, irreversible action keeps a native confirmation dialog
  const discard = () =>
    Alert.alert("Discard workout?", "Everything you logged in this workout will be lost.", [
      { text: "Keep logging", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          actions.discard();
          useRestTimer.getState().stop();
          router.back();
        },
      },
    ]);
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <KeyboardScreen style={styles.screen}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.headerButton} accessibilityLabel="Minimize workout">
              <Ionicons name="chevron-down" size={26} color={colors.primaryText} />
            </Pressable>
          ),
          headerRight: () => (
            <View style={styles.timerPill} accessible accessibilityLabel="Workout duration">
              <Ionicons name="time-outline" size={16} color={colors.onPrimarySoft} />
              <ElapsedTime startedAt={draft.startedAt} style={styles.timerText} maxFontSizeMultiplier={textScale.chrome} />
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.title}
          value={draft.title}
          onChangeText={actions.setTitle}
          placeholder="Workout name"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Workout name"
        />
        {totalSets > 0 ? (
          <Text style={styles.summary}>
            {draft.exercises.length} {draft.exercises.length === 1 ? "exercise" : "exercises"} · {doneSets}/{totalSets} sets done
          </Text>
        ) : null}
        <VisibilityPicker value={draft.visibility} onChange={actions.setVisibility} />

        {draft.exercises.length === 0 ? (
          <Card>
            <EmptyState
              icon="barbell-outline"
              title="Add your first exercise"
              message="Pick from the catalog, then log each set as you go."
              action={{ label: "Add exercise", onPress: () => router.push("/workout/pick-exercise") }}
            />
          </Card>
        ) : (
          <>
            {draft.exercises.map((entry) => (
              <ExerciseCard
                key={entry.key}
                entry={entry}
                onAddSet={() => actions.addSet(entry.key)}
                onUpdateSet={(setKey, patch) => actions.updateSet(entry.key, setKey, patch)}
                onRemoveSet={(setKey) => actions.removeSet(entry.key, setKey)}
                onRemoveExercise={() => actions.removeExercise(entry.key)}
                onSetCompleted={() => useRestTimer.getState().start()}
              />
            ))}
            <Button title="Add exercise" icon="add-circle-outline" variant="secondary" onPress={() => router.push("/workout/pick-exercise")} />
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <RestTimer />
        <View style={styles.footerButtons}>
          <Button title="Finish workout" icon="flag" size="lg" onPress={finish} loading={createWorkout.isPending} />
          <Button title="Discard workout" variant="dangerGhost" onPress={discard} />
        </View>
      </View>
    </KeyboardScreen>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { padding: t.spacing.lg, gap: t.spacing.lg, paddingBottom: t.spacing.xxl, maxWidth: 720, width: "100%", alignSelf: "center" },
  headerButton: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, justifyContent: "center" },
  timerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs + 2,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primarySoft,
  },
  timerText: { ...t.typography.label, fontFamily: t.typography.number.fontFamily, color: t.colors.onPrimarySoft, fontVariant: ["tabular-nums"] },
  title: { ...t.typography.title, fontSize: 28, lineHeight: 34, color: t.colors.text, paddingVertical: t.spacing.xs },
  summary: { ...t.typography.label, color: t.colors.textMuted, marginTop: -t.spacing.md },
  footer: {
    paddingTop: t.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
  footerButtons: { paddingHorizontal: t.spacing.lg, gap: t.spacing.xxs },
}));
