import { router } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Card, Chip, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { LeaderboardRow } from "@/features/stats/components/LeaderboardRow";
import { Podium } from "@/features/stats/components/Podium";
import { useLeaderboard } from "@/features/stats/hooks";
import type { LeaderboardMetric, LeaderboardPeriod } from "@/features/stats/types";
import { makeStyles } from "@/theme";

const PODIUM_MIN = 3; // a podium with fewer than three people just looks empty

export default function LeaderboardScreen() {
  const styles = useStyles();
  const [period, setPeriod] = useState<LeaderboardPeriod>("7d");
  const [metric, setMetric] = useState<LeaderboardMetric>("volume");
  const board = useLeaderboard(period, metric);

  const entries = board.data?.entries ?? [];
  const usePodium = entries.length >= PODIUM_MIN;
  const rest = usePodium ? entries.slice(PODIUM_MIN) : entries;
  const me = entries.find((e) => e.isMe);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={board.isRefetching && !board.isPlaceholderData} onRefresh={() => board.refetch()} />}
    >
      {/* ── Filters ──────────────────────────────── */}
      <View style={styles.filters}>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Time period">
          <Chip label="7 days" selected={period === "7d"} onPress={() => setPeriod("7d")} />
          <Chip label="30 days" selected={period === "30d"} onPress={() => setPeriod("30d")} />
        </View>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Rank by">
          <Chip label="Volume" selected={metric === "volume"} onPress={() => setMetric("volume")} />
          <Chip label="Workouts" selected={metric === "workouts"} onPress={() => setMetric("workouts")} />
        </View>
      </View>

      {board.isPending ? (
        <BoardSkeleton />
      ) : board.isError ? (
        <ErrorState error={board.error} onRetry={() => board.refetch()} />
      ) : (
        // Dimmed while a new period/metric loads (the previous board stays visible)
        <View style={[styles.board, board.isPlaceholderData && styles.loading]}>
          {me && entries.length > 1 ? (
            <Text style={styles.summary} accessibilityLiveRegion="polite">
              You're <Text style={styles.summaryRank}>#{me.rank}</Text> of {entries.length} in the last {period === "7d" ? "7" : "30"} days
            </Text>
          ) : null}

          {usePodium ? <Podium entries={entries} metric={metric} /> : null}

          {rest.length > 0 ? (
            <Card style={styles.list}>
              {rest.map((e) => (
                <LeaderboardRow key={e.user.id} entry={e} metric={metric} />
              ))}
            </Card>
          ) : null}

          {entries.length <= 1 ? (
            <Card>
              <EmptyState
                icon="people-outline"
                title="Compete with friends"
                message="The leaderboard ranks you against people you follow. Follow a few to get started."
                action={{ label: "Find people", onPress: () => router.push("/search") }}
              />
            </Card>
          ) : null}

          {/* Honest data: what's counted, and that privacy is respected */}
          <Text style={styles.caption}>
            Rolling last {period === "7d" ? "7" : "30"} days. Only workouts you can see are counted, so private workouts never affect anyone's rank.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function BoardSkeleton() {
  const styles = useStyles();
  return (
    <View style={styles.board} accessibilityRole="progressbar" accessibilityLabel="Loading leaderboard">
      <View style={styles.skeletonPodium}>
        <Skeleton height={140} radius={16} width="30%" />
        <Skeleton height={170} radius={16} width="30%" />
        <Skeleton height={120} radius={16} width="30%" />
      </View>
      <Skeleton height={64} radius={12} />
      <Skeleton height={64} radius={12} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { padding: t.spacing.lg, gap: t.spacing.lg, paddingBottom: t.spacing.xxl, maxWidth: 720, width: "100%", alignSelf: "center" },
  filters: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: t.spacing.sm },
  chips: { flexDirection: "row", gap: t.spacing.xs },
  board: { gap: t.spacing.lg },
  loading: { opacity: 0.5 },
  summary: { ...t.typography.body, color: t.colors.textMuted, textAlign: "center" },
  summaryRank: { ...t.typography.bodyStrong, color: t.colors.primaryText },
  list: { padding: t.spacing.xs, gap: t.spacing.xxs },
  caption: { ...t.typography.caption, color: t.colors.textMuted, textAlign: "center" },
  skeletonPodium: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
}));
