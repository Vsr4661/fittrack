import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { EmptyState, LargeTitle } from "@/components/ui";
import { useFeedUpdates } from "@/features/realtime/feedUpdates";
import { NewWorkoutsPill } from "@/features/realtime/NewWorkoutsPill";
import { useFeed } from "@/features/social/hooks";
import { WorkoutList } from "@/features/workouts/components/WorkoutList";
import { MIN_TOUCH, useTheme } from "@/theme";

export default function FeedScreen() {
  const feed = useFeed();
  const { colors } = useTheme();

  // Any fresh feed (pull-to-refresh, or the pill) means "new" has been seen
  useEffect(() => {
    if (feed.dataUpdatedAt) useFeedUpdates.getState().setHasNew(false);
  }, [feed.dataUpdatedAt]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <WorkoutList
        query={feed}
        showAuthor
        header={
          <LargeTitle
            title="Feed"
            action={
              <Link href="/search" asChild>
                <Pressable
                  hitSlop={8}
                  style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center" }}
                  accessibilityRole="button"
                  accessibilityLabel="Find people"
                >
                  <Ionicons name="search" size={24} color={colors.primaryText} />
                </Pressable>
              </Link>
            }
          />
        }
        empty={
          <EmptyState
            icon="people-outline"
            title="Your feed is empty"
            message="Follow people to see their workouts here, or log your own."
            action={{ label: "Find people to follow", onPress: () => router.push("/search") }}
          />
        }
      />
      <NewWorkoutsPill onPress={() => void feed.refetch()} />
    </View>
  );
}
