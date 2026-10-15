import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { makeStyles, useTheme } from "@/theme";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

/** A small, non-interactive status label: "PR", "Private", "3-day streak". */
export function Badge({ label, tone = "neutral", icon }: { label: string; tone?: Tone; icon?: keyof typeof Ionicons.glyphMap }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const fg = { neutral: colors.textMuted, brand: colors.onPrimarySoft, success: colors.success, warning: colors.warning, danger: colors.danger }[tone];
  const bg = { neutral: colors.surfaceMuted, brand: colors.primarySoft, success: `${colors.success}22`, warning: `${colors.warning}22`, danger: colors.dangerSoft }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : null}
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xxs + 1,
    borderRadius: t.radius.pill,
  },
  text: { ...t.typography.overline, fontSize: 11, letterSpacing: 0.4 },
}));
