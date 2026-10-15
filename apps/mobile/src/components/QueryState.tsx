import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { toApiError } from "@/lib/apiError";
import { colors, spacing } from "@/theme/legacy";
import { Button } from "./Button";

// Every query screen has the same loading and error states. One component
// keeps them consistent (and was previously copy-pasted across five screens).

export function LoadingView() {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
    </View>
  );
}

export function ErrorView({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.error}>{toApiError(error).message}</Text>
      <Button title="Try again" variant="secondary" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  error: { color: colors.danger, fontSize: 16, textAlign: "center" },
});
