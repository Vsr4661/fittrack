import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ActionSheet, Badge, Button, Card } from "@/components/ui";
import { makeStyles, MIN_TOUCH, textScale, useTheme } from "@/theme";
import type { DraftExercise, DraftSet } from "../draftStore";
import { isCardio, muscleLabel } from "../format";
import { DONE_COL, SET_COL, SetRow } from "./SetRow";

interface ExerciseCardProps {
  entry: DraftExercise;
  onAddSet: () => void;
  onUpdateSet: (setKey: string, patch: Partial<Omit<DraftSet, "key">>) => void;
  onRemoveSet: (setKey: string) => void;
  onRemoveExercise: () => void;
  onSetCompleted: () => void;
}

/** One exercise in the logger: header, column labels, set rows, "+ Add set". */
export function ExerciseCard({ entry, onAddSet, onUpdateSet, onRemoveSet, onRemoveExercise, onSetCompleted }: ExerciseCardProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const done = entry.sets.filter((s) => s.done).length;
  const cardio = isCardio(entry.exercise);

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.name}>{entry.exercise.name}</Text>
          <View style={styles.meta}>
            <Badge label={muscleLabel[entry.exercise.muscleGroup] ?? entry.exercise.muscleGroup} />
            <Text style={styles.progress}>
              {done}/{entry.sets.length} sets done
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => setMenuOpen(true)}
          hitSlop={8}
          style={styles.menuButton}
          accessibilityRole="button"
          accessibilityLabel={`${entry.exercise.name} options`}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Column labels, aligned with the inputs below */}
      <View style={styles.columns} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={[styles.columnLabel, { width: SET_COL }]} numberOfLines={1} maxFontSizeMultiplier={textScale.chrome}>SET</Text>
        <Text style={[styles.columnLabel, styles.flex]} numberOfLines={1} maxFontSizeMultiplier={textScale.chrome}>{cardio ? "KM" : "KG"}</Text>
        <Text style={[styles.columnLabel, styles.flex]} numberOfLines={1} maxFontSizeMultiplier={textScale.chrome}>{cardio ? "TIME" : "REPS"}</Text>
        <View style={{ width: DONE_COL }} />
      </View>

      <View style={styles.sets}>
        {entry.sets.map((set, i) => (
          <SetRow
            key={set.key}
            number={entry.sets.slice(0, i + 1).filter((x) => !x.isWarmup).length}
            set={set}
            onChange={(patch) => onUpdateSet(set.key, patch)}
            onRemove={() => onRemoveSet(set.key)}
            onComplete={onSetCompleted}
            cardio={cardio}
          />
        ))}
      </View>

      {entry.sets.length > 0 ? <Text style={styles.swipeHint}>Swipe a set left to delete it</Text> : null}
      <Button title="Add set" icon="add" variant="ghost" onPress={onAddSet} />

      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={entry.exercise.name}
        actions={[{ label: "Remove exercise", icon: "trash-outline", destructive: true, onPress: onRemoveExercise }]}
      />
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: t.spacing.sm },
  name: { ...t.typography.heading, color: t.colors.text },
  meta: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm, marginTop: t.spacing.xs },
  progress: { ...t.typography.caption, color: t.colors.textMuted },
  menuButton: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: "center", justifyContent: "center", marginTop: -t.spacing.sm, marginRight: -t.spacing.sm },
  columns: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm, paddingHorizontal: t.spacing.xs, marginBottom: -t.spacing.sm },
  columnLabel: { ...t.typography.overline, fontSize: 11, color: t.colors.textMuted, textAlign: "center" },
  sets: { gap: t.spacing.xs },
  swipeHint: { ...t.typography.caption, fontSize: 11, color: t.colors.textMuted, textAlign: "center", marginBottom: -t.spacing.sm },
}));
