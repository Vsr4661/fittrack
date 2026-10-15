import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useEffect } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/Button";
import { ElapsedTime } from "@/features/workouts/components/ElapsedTime";
import { SetRow } from "@/features/workouts/components/SetRow";
import { VisibilityPicker } from "@/features/workouts/components/VisibilityPicker";
import { draftToInput, useWorkoutDraft } from "@/features/workouts/draftStore";
import { useCreateWorkout } from "@/features/workouts/hooks";
import { toApiError } from "@/lib/apiError";
import { colors, radius, spacing } from "@/theme";

export default function NewWorkoutScreen() {
  const draft = useWorkoutDraft((s) => s.draft);
  const actions = useWorkoutDraft.getState(); // actions never change: no need to subscribe
  const createWorkout = useCreateWorkout();

  // Covers deep links / reloads straight into this screen
  useEffect(() => {
    useWorkoutDraft.getState().start();
  }, []);

  if (!draft) return null;

  const finish = () => {
    const result = draftToInput(draft);
    if (!result.ok) {
      Alert.alert("Can't save yet", result.error);
      return;
    }
    createWorkout.mutate(result.input, {
      onSuccess: (workout) => {
        actions.discard();
        // Replace (not push) so "back" from the summary goes to history, not the logger
        router.replace(`/workout/${workout.id}`);
      },
      onError: (err) => Alert.alert("Couldn't save workout", toApiError(err).message),
    });
  };

  const discard = () =>
    Alert.alert("Discard workout?", "Everything you logged in this workout will be lost.", [
      { text: "Keep logging", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => {
          actions.discard();
          router.back();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Minimize workout">
              <Ionicons name="chevron-down" size={26} color={colors.primary} />
            </Pressable>
          ),
          headerRight: () => <ElapsedTime startedAt={draft.startedAt} style={styles.timer} />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.title}
          value={draft.title}
          onChangeText={actions.setTitle}
          placeholder="Workout name"
          accessibilityLabel="Workout name"
        />
        <VisibilityPicker value={draft.visibility} onChange={actions.setVisibility} />

        {draft.exercises.map((entry) => (
          <View key={entry.key} style={styles.exercise}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{entry.exercise.name}</Text>
              <Pressable
                onPress={() => actions.removeExercise(entry.key)}
                hitSlop={8}
                accessibilityLabel={`Remove ${entry.exercise.name}`}
              >
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>

            {entry.sets.map((set, i) => (
              <SetRow
                key={set.key}
                index={i}
                set={set}
                onChange={(patch) => actions.updateSet(entry.key, set.key, patch)}
                onRemove={() => actions.removeSet(entry.key, set.key)}
              />
            ))}

            <Pressable onPress={() => actions.addSet(entry.key)} style={styles.addSet} accessibilityRole="button">
              <Text style={styles.addSetText}>+ Add set</Text>
            </Pressable>
          </View>
        ))}

        <Button title="+ Add exercise" variant="secondary" onPress={() => router.push("/workout/pick-exercise")} />
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Finish workout" onPress={finish} loading={createWorkout.isPending} />
        <Pressable onPress={discard} style={styles.discard} accessibilityRole="button">
          <Text style={styles.discardText}>Discard workout</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  timer: { fontSize: 16, fontWeight: "600", color: colors.primary, fontVariant: ["tabular-nums"] },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, paddingVertical: spacing.xs },
  exercise: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  exerciseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  exerciseName: { fontSize: 17, fontWeight: "700", color: colors.primary },
  addSet: { paddingVertical: spacing.sm, alignItems: "center" },
  addSetText: { color: colors.primary, fontWeight: "600", fontSize: 15 },
  footer: {
    padding: spacing.md,
    gap: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  discard: { paddingVertical: spacing.sm, alignItems: "center" },
  discardText: { color: colors.danger, fontSize: 15 },
});
