import { Text, View } from "react-native";
import { fonts } from "@/theme";

// Mid-tone colors chosen so white initials stay readable on every one
const palette = ["#D63F0A", "#7C3AED", "#BE185D", "#0E7490", "#15803D", "#1D4ED8"];

interface AvatarProps {
  name: string;
  /** Seeds the color, so the same person is always the same color. */
  userId: string;
  size?: number;
  /** Adds a ring (e.g. to separate an avatar overlapping a cover image). */
  ring?: string;
}

/** Initials on a colored circle. Photos replace this in the S3 upload phase. */
export function Avatar({ name, userId, size = 40, ring }: AvatarProps) {
  const hash = [...userId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: palette[hash % palette.length],
        alignItems: "center",
        justifyContent: "center",
        ...(ring ? { borderWidth: Math.max(2, size / 24), borderColor: ring } : null),
      }}
      accessibilityElementsHidden // decorative: the name is always shown next to it
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={{ color: "#FFFFFF", fontFamily: fonts.bold, fontSize: size * 0.38 }}>{initials || "?"}</Text>
    </View>
  );
}
