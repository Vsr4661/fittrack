import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, spacing } from "@/theme";
import type { DraftSet } from "../draftStore";

interface SetRowProps {
  index: number;
  set: DraftSet;
  onChange: (patch: Partial<Omit<DraftSet, "key">>) => void;
  onRemove: () => void;
}

export function SetRow({ index, set, onChange, onRemove }: SetRowProps) {
  return (
    <View style={styles.row}>
      {/* Tap the set number to toggle warmup ("W"): a common gym-app convention */}
      <Pressable
        onPress={() => onChange({ isWarmup: !set.isWarmup })}
        style={[styles.badge, set.isWarmup && styles.badgeWarmup]}
        accessibilityLabel={set.isWarmup ? `Set ${index + 1}, warmup. Tap to make it a working set` : `Set ${index + 1}. Tap to mark as warmup`}
      >
        <Text style={[styles.badgeText, set.isWarmup && styles.badgeTextWarmup]}>
          {set.isWarmup ? "W" : index + 1}
        </Text>
      </Pressable>

      <TextInput
        style={styles.input}
        value={set.weightKg}
        onChangeText={(weightKg) => onChange({ weightKg })}
        placeholder="kg"
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        accessibilityLabel={`Set ${index + 1} weight in kilograms`}
      />
      <Text style={styles.times}>×</Text>
      <TextInput
        style={styles.input}
        value={set.reps}
        onChangeText={(reps) => onChange({ reps })}
        placeholder="reps"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        accessibilityLabel={`Set ${index + 1} reps`}
      />

      <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Remove set ${index + 1}`}>
        <Ionicons name="close-circle" size={22} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeWarmup: { backgroundColor: "#FEF3C7" },
  badgeText: { fontWeight: "700", color: colors.text },
  badgeTextWarmup: { color: "#B45309" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    fontSize: 16,
    textAlign: "center",
    color: colors.text,
    backgroundColor: colors.background,
  },
  times: { color: colors.textMuted, fontSize: 16 },
});
