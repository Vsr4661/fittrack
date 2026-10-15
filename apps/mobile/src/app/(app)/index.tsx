import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { useLogout, useMe } from "@/features/auth/hooks";
import { toApiError } from "@/lib/apiError";
import { colors, spacing } from "@/theme";

export default function HomeScreen() {
  const me = useMe();
  const logout = useLogout();

  // Every query has three states: loading, error, success. Handle all of them.
  if (me.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (me.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{toApiError(me.error).message}</Text>
        <Button title="Try again" onPress={() => me.refetch()} variant="secondary" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Welcome, {me.data.displayName} 👋</Text>
      <Text style={styles.muted}>@{me.data.username}</Text>
      <Text style={styles.muted}>{me.data.email}</Text>
      <View style={styles.spacer} />
      <Button title="Log out" onPress={() => logout.mutate()} loading={logout.isPending} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  greeting: { fontSize: 26, fontWeight: "700", color: colors.text },
  muted: { fontSize: 16, color: colors.textMuted },
  error: { color: colors.danger, fontSize: 16, textAlign: "center" },
  spacer: { flex: 1 },
});
