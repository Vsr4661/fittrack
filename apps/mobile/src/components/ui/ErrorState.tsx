import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { toApiError } from "@/lib/apiError";
import { makeStyles, useTheme } from "@/theme";
import { Button } from "./Button";

/** Full-area error with the server's message and a retry: every query screen uses it. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { code, message } = toApiError(error);
  const offline = code === "NETWORK_ERROR";

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconCircle}>
        <Ionicons name={offline ? "cloud-offline-outline" : "warning-outline"} size={30} color={colors.danger} />
      </View>
      <Text style={styles.title}>{offline ? "You're offline" : "Something went wrong"}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.action}>
        <Button title="Try again" icon="refresh" variant="secondary" onPress={onRetry} fullWidth={false} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: t.spacing.sm,
    padding: t.spacing.xl,
    backgroundColor: t.colors.background,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: t.colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.spacing.sm,
  },
  title: { ...t.typography.heading, color: t.colors.text },
  message: { ...t.typography.body, color: t.colors.textMuted, textAlign: "center", maxWidth: 320 },
  action: { marginTop: t.spacing.md },
}));
