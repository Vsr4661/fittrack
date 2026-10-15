import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text } from "react-native";
import type { WorkoutSocial } from "@/features/workouts/types";
import { colors, spacing } from "@/theme";
import { useToggleLike } from "../hooks";

export function LikeButton({ workoutId, social }: { workoutId: string; social: WorkoutSocial }) {
  const toggleLike = useToggleLike();
  const { likedByMe, likeCount } = social;

  return (
    <Pressable
      // No `disabled` while pending: the optimistic update makes rapid taps safe
      onPress={() => toggleLike.mutate({ workoutId, liked: !likedByMe })}
      hitSlop={8}
      style={styles.button}
      accessibilityRole="button"
      accessibilityState={{ selected: likedByMe }}
      accessibilityLabel={`${likedByMe ? "Unlike" : "Like"}. ${likeCount} ${likeCount === 1 ? "like" : "likes"}`}
    >
      <Ionicons name={likedByMe ? "heart" : "heart-outline"} size={22} color={likedByMe ? colors.danger : colors.textMuted} />
      <Text style={styles.count}>{likeCount}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  count: { fontSize: 15, color: colors.textMuted, fontVariant: ["tabular-nums"], minWidth: 16 },
});
