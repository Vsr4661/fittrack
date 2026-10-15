import { router } from "expo-router";
import { View } from "react-native";
import { EmptyState } from "@/components/ui";
import { useFeed } from "@/features/social/hooks";
import { WorkoutList } from "@/features/workouts/components/WorkoutList";
import { useTheme } from "@/theme";

export default function FeedScreen() {
  const feed = useFeed();
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <WorkoutList
        query={feed}
        showAuthor
        empty={
          <EmptyState
            icon="people-outline"
            title="Your feed is empty"
            message="Follow people to see their workouts here, or log your own."
            action={{ label: "Find people to follow", onPress: () => router.push("/search") }}
          />
        }
      />
    </View>
  );
}
