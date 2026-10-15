import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, radius } from "@/theme/legacy";

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary";
}

export function Button({ title, onPress, loading = false, variant = "primary" }: ButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <Pressable
      onPress={onPress}
      disabled={loading} // prevents double-submits while a request is in flight
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled: loading }}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        (pressed || loading) && styles.dimmed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.primaryText : colors.primary} />
      ) : (
        <Text style={[styles.text, { color: isPrimary ? colors.primaryText : colors.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, paddingVertical: 14, alignItems: "center", minHeight: 50 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surface },
  dimmed: { opacity: 0.7 },
  text: { fontSize: 16, fontWeight: "600" },
});
