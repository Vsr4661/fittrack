import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { Badge } from "@/components/ui";
import { makeStyles, MIN_TOUCH, useTheme } from "@/theme";

/**
 * "Continue with Apple / Google", visibly marked as coming soon and disabled.
 * Real OAuth needs server work and changes to auth, so it's a separate phase;
 * these are purely visual for now (no handlers, nothing happens on tap).
 */
export function SocialLoginButtons() {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.or}>or</Text>
        <View style={styles.line} />
      </View>
      {(
        [
          { label: "Continue with Apple", icon: "logo-apple" },
          { label: "Continue with Google", icon: "logo-google" },
        ] as const
      ).map((p) => (
        <View
          key={p.label}
          style={styles.button}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${p.label}, coming soon`}
          accessibilityState={{ disabled: true }}
        >
          <Ionicons name={p.icon} size={20} color={colors.textMuted} />
          <Text style={styles.label}>{p.label}</Text>
          <Badge label="Soon" />
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { gap: t.spacing.md },
  divider: { flexDirection: "row", alignItems: "center", gap: t.spacing.md },
  line: { flex: 1, height: 1, backgroundColor: t.colors.border },
  or: { ...t.typography.caption, color: t.colors.textMuted },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.sm,
    minHeight: MIN_TOUCH + 4,
    borderRadius: t.radius.md,
    borderWidth: 1.5,
    borderColor: t.colors.border,
  },
  label: { ...t.typography.bodyStrong, color: t.colors.textMuted },
}));
