import { ActivityIndicator, View } from "react-native";
import { makeStyles, useTheme } from "@/theme";

/**
 * Full-area spinner for short, layout-free loads (e.g. resolving "/me" before
 * a profile). Prefer a Skeleton whenever the incoming layout is known.
 */
export function LoadingState() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel="Loading">
      <ActivityIndicator color={colors.textMuted} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.colors.background },
}));
