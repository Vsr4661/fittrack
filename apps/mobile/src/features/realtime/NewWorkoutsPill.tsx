import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "@/components/ui";
import { haptics } from "@/lib/haptics";
import { makeStyles, MIN_TOUCH, textScale, useTheme } from "@/theme";
import { useFeedUpdates } from "./feedUpdates";

/**
 * "New workouts" on the Feed when someone you follow posts. A pill rather than
 * inserting the post: the list never moves while you're reading it, and you
 * choose when to refresh. (Reanimated's entering/exiting animations respect
 * the OS Reduce Motion setting by default.)
 */
export function NewWorkoutsPill({ onPress }: { onPress: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const hasNew = useFeedUpdates((s) => s.hasNew);
  if (!hasNew) return null;

  return (
    <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)} style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <PressableScale
        onPress={() => {
          haptics.selection();
          useFeedUpdates.getState().setHasNew(false);
          onPress();
        }}
        style={styles.pill}
        accessibilityRole="button"
        accessibilityLabel="New workouts. Double tap to refresh the feed"
        accessibilityLiveRegion="polite"
      >
        <Ionicons name="arrow-up" size={16} color={colors.onPrimary} />
        <Text style={styles.label} maxFontSizeMultiplier={textScale.chrome}>
          New workouts
        </Text>
      </PressableScale>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  wrap: { position: "absolute", left: 0, right: 0, alignItems: "center", zIndex: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.xs,
    minHeight: MIN_TOUCH,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primary, // Ember: white text on it passes (4.59:1)
    ...t.shadows.md,
  },
  label: { ...t.typography.label, color: t.colors.onPrimary },
}));
