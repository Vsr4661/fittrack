import type { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { Chip } from "@/components/ui";
import { makeStyles } from "@/theme";
import type { Visibility } from "../types";

const options: { value: Visibility; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "PUBLIC", label: "Everyone", icon: "globe-outline" },
  { value: "FOLLOWERS", label: "Followers", icon: "people-outline" },
  { value: "PRIVATE", label: "Only me", icon: "lock-closed-outline" },
];

/** Who can see this workout: one tap, always visible (no hidden menu). */
export function VisibilityPicker({ value, onChange }: { value: Visibility; onChange: (v: Visibility) => void }) {
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Who can see this workout">
      {options.map((o) => (
        <Chip key={o.value} label={o.label} icon={o.icon} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.sm },
}));
