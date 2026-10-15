import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { toast } from "@/components/ui";
import { haptics } from "@/lib/haptics";
import { makeStyles, MIN_TOUCH, useTheme } from "@/theme";
import type { DraftSet } from "../draftStore";

interface SetRowProps {
  /** Working-set number (1, 2, 3...). Warmups don't count, like in most lifting apps. */
  number: number;
  set: DraftSet;
  onChange: (patch: Partial<Omit<DraftSet, "key">>) => void;
  onRemove: () => void;
  /** Called when the set is ticked off (starts the rest timer). */
  onComplete: () => void;
}

/** Column widths shared with the header row in ExerciseCard, so they line up. */
export const SET_COL = 44;
export const DONE_COL = MIN_TOUCH;

/**
 * One set: [set # / warmup] [kg] [reps] [✓]. Swipe left to delete.
 * Sized for the gym: big inputs and 44pt+ targets you can hit with sweaty
 * hands between sets.
 */
export function SetRow({ number, set, onChange, onRemove, onComplete }: SetRowProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const label = set.isWarmup ? "Warmup set" : `Set ${number}`;

  const toggleDone = () => {
    if (!set.done && set.reps.trim() === "") {
      haptics.warning();
      toast.info("Enter reps first, then tick the set off");
      return;
    }
    const done = !set.done;
    onChange({ done });
    if (done) {
      haptics.success();
      onComplete();
    } else {
      haptics.selection();
    }
  };

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={(_progress, _translation, methods) => (
        <Pressable
          onPress={() => {
            methods.close();
            haptics.warning();
            onRemove();
          }}
          style={styles.deleteAction}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${label}`}
        >
          <Ionicons name="trash" size={20} color={colors.onPrimary} />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      )}
    >
      <View
        style={[styles.row, set.done && styles.rowDone]}
        // Swipe gestures aren't reachable with a screen reader: offer the same action here
        accessibilityActions={[{ name: "delete", label: "Delete set" }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === "delete" && onRemove()}
      >
        {/* Tap the set number to toggle warmup ("W"): a common gym-app convention */}
        <Pressable
          onPress={() => {
            haptics.selection();
            onChange({ isWarmup: !set.isWarmup });
          }}
          style={[styles.badge, set.isWarmup && styles.badgeWarmup]}
          accessibilityRole="button"
          accessibilityLabel={`${label}. Double tap to ${set.isWarmup ? "make it a working set" : "mark as warmup"}`}
        >
          <Text style={[styles.badgeText, set.isWarmup && styles.badgeTextWarmup]}>{set.isWarmup ? "W" : number}</Text>
        </Pressable>

        <TextInput
          style={[styles.input, set.done && styles.inputDone]}
          value={set.weightKg}
          onChangeText={(weightKg) => onChange({ weightKg })}
          placeholder="—"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          selectTextOnFocus // tap once to overwrite the copied value
          accessibilityLabel={`${label} weight in kilograms`}
        />
        <TextInput
          style={[styles.input, set.done && styles.inputDone]}
          value={set.reps}
          onChangeText={(reps) => onChange({ reps })}
          placeholder="—"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          selectTextOnFocus
          accessibilityLabel={`${label} reps`}
        />

        <Pressable
          onPress={toggleDone}
          style={[styles.check, set.done && styles.checkDone]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: set.done }}
          accessibilityLabel={`${label} done`}
        >
          <Ionicons name="checkmark" size={24} color={set.done ? colors.onSuccess : colors.textMuted} />
        </Pressable>
      </View>
    </ReanimatedSwipeable>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
    paddingVertical: t.spacing.xs + 2,
    paddingHorizontal: t.spacing.xs,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface, // opaque, so the swipe action hides behind it
  },
  rowDone: { backgroundColor: t.colors.successSoft },
  badge: {
    width: SET_COL,
    height: SET_COL,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeWarmup: { backgroundColor: t.colors.warningSoft },
  badgeText: { ...t.typography.bodyStrong, color: t.colors.text },
  badgeTextWarmup: { color: t.colors.warning },
  input: {
    flex: 1,
    height: 48,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
    textAlign: "center",
    ...t.typography.number,
    fontSize: 20,
    color: t.colors.text,
  },
  inputDone: { backgroundColor: "transparent" },
  check: {
    width: DONE_COL,
    height: DONE_COL,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  checkDone: { backgroundColor: t.colors.success },
  deleteAction: {
    width: 88,
    marginLeft: t.spacing.sm,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.danger,
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.xxs,
  },
  deleteText: { ...t.typography.caption, color: t.colors.onPrimary },
}));
