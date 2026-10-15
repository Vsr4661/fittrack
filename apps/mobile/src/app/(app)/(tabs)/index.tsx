import { router } from "expo-router";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { WorkoutCard } from "@/features/workouts/components/WorkoutCard";
import { useWorkoutDraft } from "@/features/workouts/draftStore";
import { useWorkoutHistory } from "@/features/workouts/hooks";
import { toApiError } from "@/lib/apiError";
import { colors, spacing } from "@/theme";

export default function WorkoutHistoryScreen() {
  const history = useWorkoutHistory();
  const hasDraft = useWorkoutDraft((s) => s.draft !== null);

  const startOrResume = () => {
    useWorkoutDraft.getState().start(); // no-op if one is already in progress
    router.push("/workout/new");
  };

  if (history.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (history.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{toApiError(history.error).message}</Text>
        <Button title="Try again" variant="secondary" onPress={() => history.refetch()} />
      </View>
    );
  }

  const workouts = history.data.pages.flatMap((page) => page.items);

  return (
    <View style={styles.container}>
      <FlatList
        data={workouts}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => <WorkoutCard workout={item} />}
        contentContainerStyle={styles.list}
        // Infinite scroll: load the next cursor page shortly before the end
        onEndReached={() => {
          if (history.hasNextPage && !history.isFetchingNextPage) history.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={history.isRefetching && !history.isFetchingNextPage} onRefresh={() => history.refetch()} />
        }
        ListFooterComponent={history.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No workouts yet</Text>
            <Text style={styles.emptyText}>Start your first workout and it will show up here.</Text>
          </View>
        }
      />
      <View style={styles.cta}>
        <Button title={hasDraft ? "Resume workout" : "Start workout"} onPress={startOrResume} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.background },
  error: { color: colors.danger, fontSize: 16, textAlign: "center" },
  footer: { paddingVertical: spacing.md },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingTop: spacing.xl },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  emptyText: { fontSize: 15, color: colors.textMuted, textAlign: "center" },
  cta: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
