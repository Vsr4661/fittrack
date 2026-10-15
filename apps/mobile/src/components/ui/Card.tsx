import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { makeStyles } from "@/theme";
import { PressableScale } from "./PressableScale";

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** "flat" for cards inside other cards (no shadow, muted fill). */
  variant?: "raised" | "flat";
  accessibilityLabel?: string;
}

/** A surface for grouped content. Pressable (with the scale effect) only when given onPress. */
export function Card({ children, onPress, style, variant = "raised", accessibilityLabel }: CardProps) {
  const styles = useStyles();
  const cardStyle = [styles.base, variant === "raised" ? styles.raised : styles.flat, style];

  if (!onPress) return <View style={cardStyle}>{children}</View>;
  return (
    <PressableScale onPress={onPress} style={cardStyle} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      {children}
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  base: { borderRadius: t.radius.lg, padding: t.spacing.lg, gap: t.spacing.md },
  raised: {
    backgroundColor: t.colors.surface,
    ...t.shadows.sm,
    // Dark mode: shadows vanish on near-black, so a hairline border gives the edge
    ...(t.scheme === "dark" ? { borderWidth: 1, borderColor: t.colors.border } : null),
  },
  flat: { backgroundColor: t.colors.surfaceMuted },
}));
