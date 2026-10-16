import { Image } from "expo-image";
import type { ImageStyle, StyleProp } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { makeStyles } from "@/theme";

interface PhotoProps {
  uri: string;
  /**
   * What the image is cached under. Workout photo links are signed and change
   * on every fetch, so caching by URL would re-download every photo on every
   * refresh; the storage key is stable.
   */
  cacheKey?: string;
  style?: StyleProp<ImageStyle>;
  /** Omit for decorative images (the screen reader skips them). */
  accessibilityLabel?: string;
}

/** A remote or local image, cropped to fill its box, on a muted placeholder while it loads. */
export function Photo({ uri, cacheKey, style, accessibilityLabel }: PhotoProps) {
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  return (
    <Image
      source={{ uri, cacheKey }}
      style={[styles.base, style]}
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={cacheKey ?? uri} // list cells reuse views: never flash the previous row's photo
      transition={reduceMotion ? 0 : 150}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors // a photo inverted by Smart Invert looks broken
    />
  );
}

const useStyles = makeStyles((t) => ({
  base: { backgroundColor: t.colors.surfaceMuted, overflow: "hidden" },
}));
