import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/legacy";

const palette = ["#2563EB", "#7C3AED", "#DB2777", "#EA580C", "#16A34A", "#0891B2"];

/** Initials on a colored circle. Photos replace this in the S3 upload phase. */
export function Avatar({ name, userId, size = 40 }: { name: string; userId: string; size?: number }) {
  // Same user -> same color everywhere, derived from their id (no storage needed)
  const hash = [...userId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <View
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: palette[hash % palette.length] }]}
      accessibilityElementsHidden // decorative: the name is always shown next to it
    >
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initials || "?"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  text: { color: colors.primaryText, fontWeight: "700" },
});
