import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "@/theme";

export function EmptyState({ title, message, children }: { title: string; message: string; children?: ReactNode }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingTop: spacing.xl, paddingHorizontal: spacing.lg },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  message: { fontSize: 15, color: colors.textMuted, textAlign: "center" },
});
