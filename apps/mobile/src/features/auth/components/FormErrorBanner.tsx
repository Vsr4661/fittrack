import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { makeStyles, useTheme } from "@/theme";

/** Form-level errors (wrong password, email taken, offline) above the submit button. */
export function FormErrorBanner({ message }: { message?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (!message) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Ionicons name="alert-circle" size={20} color={colors.danger} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.dangerSoft,
  },
  text: { ...t.typography.label, color: t.colors.danger, flex: 1 },
}));
