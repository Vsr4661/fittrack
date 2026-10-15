import type { ReactNode } from "react";
import { Platform, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { makeStyles, textScale } from "@/theme";

/** iOS shows large titles on top-level screens; Android keeps its top app bar. */
export const USE_LARGE_TITLE = Platform.OS === "ios";

/**
 * iOS-style large title for top-level tab screens, rendered as the list
 * header (pair with `headerShown: !USE_LARGE_TITLE` on the tab).
 * Limitation: it doesn't collapse into an inline title on scroll; that needs
 * a native-stack header, which JS bottom tabs don't provide.
 */
export function LargeTitle({ title, action }: { title: string; action?: ReactNode }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  if (!USE_LARGE_TITLE) return null;

  return (
    <View style={[styles.row, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={textScale.display} numberOfLines={1}>
        {title}
      </Text>
      {action}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: "row", alignItems: "center", gap: t.spacing.md, paddingBottom: t.spacing.lg },
  // 34pt matches the iOS Large Title text style
  title: { ...t.typography.display, fontSize: 34, lineHeight: 41, color: t.colors.text, flex: 1 },
}));
