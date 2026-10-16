import { Image } from "expo-image";
import { useState } from "react";
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
  /** The profile photo. Initials show while there is none, or if it fails to load. */
  uri?: string | null;
}

/** A profile photo in a circle, falling back to initials on the person's color. */
export function Avatar({ name, userId, size = 40, ring, uri }: AvatarProps) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
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
      {/* Sized to the circle, not to the reader's text setting: scaled initials
          overflowed the circle at large accessibility sizes. Screen readers
          read the name from the parent's label, so nothing is lost. */}
      <Text style={{ color: "#FFFFFF", fontFamily: fonts.bold, fontSize: size * 0.38 }} allowFontScaling={false}>
        {initials || "?"}
      </Text>
      {/* On top of the initials, so they show through while it loads or if it fails.
          The avatar URL is stable (a redirect to storage), so it caches by URL. */}
      {uri && uri !== failedUri ? (
        <Image
          source={{ uri }}
          style={{ position: "absolute", width: "100%", height: "100%", borderRadius: size / 2 }}
          contentFit="cover"
          cachePolicy="memory-disk"
          onError={() => setFailedUri(uri)}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}
