import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { PressableScale } from "@/components/ui";
import type { WorkoutSocial } from "@/features/workouts/types";
import { haptics } from "@/lib/haptics";
import { makeStyles, useTheme } from "@/theme";
import { useToggleLike } from "../hooks";

export function LikeButton({ workoutId, social }: { workoutId: string; social: WorkoutSocial }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const toggleLike = useToggleLike();
  const { likedByMe, likeCount } = social;

  // A little "pop" when it turns red, the same feedback people know from Instagram
  const scale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isFirstRender = useRef(true);
  useEffect(() => {
    // Only pop on a change, not when a list first renders already-liked workouts
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (likedByMe) scale.value = withSequence(withSpring(1.3, { damping: 6 }), withSpring(1));
  }, [likedByMe, scale]);

  return (
    <PressableScale
      // No `disabled` while pending: the optimistic update makes rapid taps safe
      onPress={() => {
        haptics.selection();
        toggleLike.mutate({ workoutId, liked: !likedByMe });
      }}
      hitSlop={10}
      activeScale={0.9}
      style={styles.button}
      accessibilityRole="button"
      accessibilityState={{ selected: likedByMe }}
      accessibilityLabel={`${likedByMe ? "Unlike" : "Like"}. ${likeCount} ${likeCount === 1 ? "like" : "likes"}`}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name={likedByMe ? "heart" : "heart-outline"} size={22} color={likedByMe ? colors.danger : colors.textMuted} />
      </Animated.View>
      <Text style={styles.count}>{likeCount}</Text>
    </PressableScale>
  );
}

const useStyles = makeStyles((t) => ({
  button: { flexDirection: "row", alignItems: "center", gap: t.spacing.xs + 2, minHeight: 36, paddingRight: t.spacing.xs },
  count: { ...t.typography.label, color: t.colors.textMuted, fontVariant: ["tabular-nums"], minWidth: 16 },
}));
