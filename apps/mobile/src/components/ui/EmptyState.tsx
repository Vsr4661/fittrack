import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { makeStyles, useTheme } from "@/theme";
import { Button } from "./Button";

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  /** An empty state should usually offer the next step. */
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={32} color={colors.onPrimarySoft} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action ? (
        <View style={styles.action}>
          <Button title={action.label} onPress={action.onPress} fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.sm,
    paddingVertical: t.spacing.xxxl,
    paddingHorizontal: t.spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: t.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.spacing.sm,
  },
  title: { ...t.typography.heading, color: t.colors.text, textAlign: "center" },
  message: { ...t.typography.body, color: t.colors.textMuted, textAlign: "center", maxWidth: 320 },
  action: { marginTop: t.spacing.md },
}));
