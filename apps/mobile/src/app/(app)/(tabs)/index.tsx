import { router } from "expo-router";
import { View } from "react-native";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useFeed } from "@/features/social/hooks";
import { WorkoutList } from "@/features/workouts/components/WorkoutList";
import { colors } from "@/theme";

export default function FeedScreen() {
  const feed = useFeed();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <WorkoutList
        query={feed}
        showAuthor
        empty={
          <EmptyState title="Your feed is empty" message="Follow people to see their workouts here, or log your own.">
            <Button title="Find people to follow" onPress={() => router.push("/search")} />
          </EmptyState>
        }
      />
    </View>
  );
}
