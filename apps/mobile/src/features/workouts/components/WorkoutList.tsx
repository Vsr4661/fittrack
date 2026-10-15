import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from "react-native";
import { ErrorView, LoadingView } from "@/components/QueryState";
import { spacing } from "@/theme/legacy";
import type { WorkoutPage } from "../types";
import { WorkoutCard } from "./WorkoutCard";

interface WorkoutListProps {
  query: UseInfiniteQueryResult<InfiniteData<WorkoutPage>>;
  showAuthor?: boolean;
  header?: ReactElement;
  empty: ReactElement;
}

/**
 * Infinite-scrolling, pull-to-refresh list of workout cards. Shared by the
 * feed, my history and profile pages: one implementation of pagination.
 */
export function WorkoutList({ query, showAuthor, header, empty }: WorkoutListProps) {
  if (query.isPending) return <LoadingView />;
  if (query.isError) return <ErrorView error={query.error} onRetry={() => query.refetch()} />;

  const workouts = query.data.pages.flatMap((page) => page.items);

  return (
    <FlatList
      data={workouts}
      keyExtractor={(w) => w.id}
      renderItem={({ item }) => <WorkoutCard workout={item} showAuthor={showAuthor} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      // Load the next cursor page shortly before reaching the end
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} />
      }
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : null}
      ListEmptyComponent={empty}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.md, gap: spacing.md, flexGrow: 1 },
  footer: { paddingVertical: spacing.md },
});
