import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, View } from "react-native";
import { haptics } from "@/lib/haptics";
import { makeStyles, MIN_TOUCH, useTheme } from "@/theme";
import { PressableScale } from "./PressableScale";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Defaults to true; set false for inline buttons that size to their label. */
  fullWidth?: boolean;
  accessibilityHint?: string;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  accessibilityHint,
}: ButtonProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const inactive = disabled || loading;

  // Disabled = neutral grey, not a faded brand color: fading orange over a dark
  // background turns muddy brown, and grey reads as "unavailable" in any theme
  const contentColor = disabled
    ? colors.textMuted
    : { primary: colors.onPrimary, secondary: colors.text, ghost: colors.primaryText, danger: colors.danger }[variant];

  return (
    <PressableScale
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      disabled={inactive} // also blocks double-submits while a request is in flight
      activeScale={0.96}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        styles.base,
        size === "lg" && styles.large,
        fullWidth ? styles.fullWidth : styles.inline,
        disabled ? styles.disabled : styles[variant],
      ]}
    >
      {/* Label stays in the layout while loading (just hidden), so the button
          doesn't change width and nothing around it jumps */}
      <View style={[styles.content, loading && styles.hidden]}>
        {icon ? <Ionicons name={icon} size={18} color={contentColor} /> : null}
        <Text style={[styles.label, size === "lg" && styles.labelLarge, { color: contentColor }]}>{title}</Text>
      </View>
      {loading ? <ActivityIndicator style={styles.spinner} color={contentColor} /> : null}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    minHeight: MIN_TOUCH + 4,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  large: { minHeight: 56, borderRadius: t.radius.lg },
  fullWidth: { alignSelf: "stretch" },
  inline: { alignSelf: "flex-start" },
  primary: { backgroundColor: t.colors.primary, ...t.shadows.sm },
  secondary: { backgroundColor: t.colors.surfaceMuted },
  ghost: { backgroundColor: "transparent" },
  danger: { backgroundColor: t.colors.dangerSoft },
  disabled: { backgroundColor: t.colors.surfaceMuted },
  content: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm },
  hidden: { opacity: 0 },
  spinner: { position: "absolute" },
  label: { ...t.typography.bodyStrong },
  labelLarge: { fontSize: 17 },
}));
