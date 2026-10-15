import { FlashList } from "@shopify/flash-list";
import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, View } from "react-native";
import { ErrorState, WorkoutCardSkeleton } from "@/components/ui";
import { makeStyles } from "@/theme";
import type { WorkoutPage } from "../types";
import { WorkoutCard } from "./WorkoutCard";

interface WorkoutListProps {
  query: UseInfiniteQueryResult<InfiniteData<WorkoutPage>>;
  showAuthor?: boolean;
  header?: ReactElement;
  empty: ReactElement;
}

/**
 * Infinite-scrolling, pull-to-refresh list of workout cards, shared by the
 * feed, my history and profile pages (one implementation of pagination).
 *
 * FlashList instead of FlatList: it recycles row views as you scroll instead
 * of creating new ones, so long feeds stay smooth and memory stays flat.
 */
export function WorkoutList({ query, showAuthor, header, empty }: WorkoutListProps) {
  const styles = useStyles();

  if (query.isPending) {
    // Skeletons in the same layout as the real list: nothing jumps when data lands
    return (
      <ScrollView contentContainerStyle={styles.content} scrollEnabled={false}>
        {header}
        <View style={styles.skeletons}>
          <WorkoutCardSkeleton showAuthor={showAuthor} />
          <WorkoutCardSkeleton showAuthor={showAuthor} />
          <WorkoutCardSkeleton showAuthor={showAuthor} />
        </View>
      </ScrollView>
    );
  }
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;

  const workouts = query.data.pages.flatMap((page) => page.items);

  return (
    <FlashList
      data={workouts}
      keyExtractor={(w) => w.id}
      renderItem={({ item }) => <WorkoutCard workout={item} showAuthor={showAuthor} />}
      ItemSeparatorComponent={Separator}
      contentContainerStyle={styles.content}
      ListHeaderComponent={header}
      // Load the next cursor page shortly before reaching the end
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} />}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : null}
      ListEmptyComponent={empty}
    />
  );
}

function Separator() {
  return <View style={{ height: 12 }} />;
}

const useStyles = makeStyles((t) => ({
  content: { padding: t.spacing.lg },
  skeletons: { gap: t.spacing.md },
  footer: { paddingVertical: t.spacing.lg },
}));
