import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import { haptics } from "@/lib/haptics";
import { makeStyles, MIN_TOUCH, useTheme } from "@/theme";
import { PressableScale } from "./PressableScale";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** A selectable pill: filters (muscle groups), options (visibility). */
export function Chip({ label, selected = false, onPress, icon }: ChipProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = selected ? colors.onPrimary : colors.text;

  return (
    <PressableScale
      onPress={() => {
        haptics.selection();
        onPress?.();
      }}
      activeScale={0.94}
      hitSlop={{ top: (MIN_TOUCH - 36) / 2, bottom: (MIN_TOUCH - 36) / 2 }} // 36pt pill, 44pt touch target
      style={[styles.chip, selected && styles.selected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {icon ? <Ionicons name={icon} size={16} color={color} /> : null}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs + 2,
    height: 36,
    paddingHorizontal: t.spacing.md + 2,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.surfaceMuted,
  },
  selected: { backgroundColor: t.colors.primary },
  label: { ...t.typography.label },
}));
