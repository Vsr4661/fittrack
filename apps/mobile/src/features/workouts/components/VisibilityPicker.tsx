import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "@/theme";
import type { Visibility } from "../types";

const options: { value: Visibility; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "PUBLIC", label: "Everyone", icon: "globe-outline" },
  { value: "FOLLOWERS", label: "Followers", icon: "people-outline" },
  { value: "PRIVATE", label: "Only me", icon: "lock-closed-outline" },
];

/** Segmented control: who can see this workout. */
export function VisibilityPicker({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Who can see this workout">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.option, selected && styles.selected]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Ionicons name={o.icon} size={16} color={selected ? colors.primaryText : colors.textMuted} />
            <Text style={[styles.label, selected && styles.labelSelected]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.md, padding: 3 },
  option: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 8,
    borderRadius: radius.md - 2,
  },
  selected: { backgroundColor: colors.primary },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  labelSelected: { color: colors.primaryText },
});
