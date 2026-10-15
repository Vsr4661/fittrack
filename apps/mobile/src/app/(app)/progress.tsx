import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Card, Chip, EmptyState, ErrorState, Skeleton } from "@/components/ui";
import { PrCard } from "@/features/stats/components/PrCard";
import { formatMetric, WeeklyBarChart } from "@/features/stats/components/WeeklyBarChart";
import { useChartWindow, useProgress } from "@/features/stats/hooks";
import type { LeaderboardMetric } from "@/features/stats/types";
import { bucketByWeek, CHART_WEEKS } from "@/features/stats/weeks";
import { makeStyles, textScale } from "@/theme";

export default function ProgressScreen() {
  const styles = useStyles();
  const { weekStarts, since } = useChartWindow();
  const progress = useProgress(since);
  const [metric, setMetric] = useState<LeaderboardMetric>("volume");

  // Bucketed on the device, in the device's time zone (the server only filters by `since`)
  const buckets = useMemo(() => bucketByWeek(progress.data?.sessions ?? [], weekStarts), [progress.data, weekStarts]);
  const totals = useMemo(() => {
    const workouts = buckets.reduce((n, b) => n + b.workouts, 0);
    const volume = buckets.reduce((n, b) => n + b.volumeGrams, 0);
    return { workouts, volume, perWeek: workouts / CHART_WEEKS };
  }, [buckets]);

  if (progress.isPending) return <ProgressSkeleton />;
  if (progress.isError) return <ErrorState error={progress.error} onRetry={() => progress.refetch()} />;

  const records = progress.data.personalRecords;
  const now = new Date();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={progress.isRefetching} onRefresh={() => progress.refetch()} />}
    >
      {/* ── 12-week totals ───────────────────────── */}
      <View style={styles.stats}>
        <Stat value={String(totals.workouts)} label="Workouts" />
        <Stat value={formatMetric("volume", totals.volume)} label="Volume" />
        <Stat value={totals.perWeek.toFixed(1)} label="Per week" />
      </View>
      <Text style={styles.caption}>Last {CHART_WEEKS} weeks</Text>

      {/* ── Weekly chart ─────────────────────────── */}
      <Card>
        <View style={styles.chartHeader}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Weekly {metric === "volume" ? "volume" : "workouts"}
          </Text>
          <View style={styles.chips}>
            <Chip label="Volume" selected={metric === "volume"} onPress={() => setMetric("volume")} />
            <Chip label="Workouts" selected={metric === "workouts"} onPress={() => setMetric("workouts")} />
          </View>
        </View>
        {totals.workouts === 0 ? (
          <EmptyState icon="stats-chart-outline" title="Nothing to chart yet" message={`Workouts from the last ${CHART_WEEKS} weeks show up here, one bar per week.`} />
        ) : (
          <WeeklyBarChart buckets={buckets} metric={metric} />
        )}
      </Card>

      {/* ── Personal records ─────────────────────── */}
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Personal records
      </Text>
      {records.length === 0 ? (
        <Card>
          <EmptyState icon="trophy-outline" title="No records yet" message="Log a weighted set and your best lift for each exercise appears here." />
        </Card>
      ) : (
        records.map((r) => <PrCard key={r.exercise.id} record={r} now={now} />)
      )}
      {/* Honest data: say what a "record" is measured on */}
      <Text style={styles.caption}>
        Records are your heaviest working set per exercise (warmups don't count). Bodyweight and cardio records aren't tracked yet.
      </Text>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}, last ${CHART_WEEKS} weeks`}>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={textScale.display}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={textScale.chrome}>
        {label}
      </Text>
    </View>
  );
}

function ProgressSkeleton() {
  const styles = useStyles();
  return (
    <View style={[styles.screen, styles.content]} accessibilityRole="progressbar" accessibilityLabel="Loading progress">
      <View style={styles.stats}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.flex}>
            <Skeleton height={72} radius={16} />
          </View>
        ))}
      </View>
      <Skeleton height={220} radius={16} />
      <Skeleton width={160} height={20} />
      <Skeleton height={76} radius={16} />
      <Skeleton height={76} radius={16} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { padding: t.spacing.lg, gap: t.spacing.lg, paddingBottom: t.spacing.xxl, maxWidth: 720, width: "100%", alignSelf: "center" },
  flex: { flex: 1 },
  stats: { flexDirection: "row", gap: t.spacing.sm },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: t.spacing.xxs,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.xs,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.surface,
    ...t.shadows.sm,
    ...(t.scheme === "dark" ? { borderWidth: 1, borderColor: t.colors.border } : null),
  },
  statValue: { ...t.typography.number, color: t.colors.text },
  statLabel: { ...t.typography.caption, color: t.colors.textMuted },
  caption: { ...t.typography.caption, color: t.colors.textMuted, marginTop: -t.spacing.sm },
  chartHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: t.spacing.sm },
  chips: { flexDirection: "row", gap: t.spacing.xs },
  sectionTitle: { ...t.typography.heading, color: t.colors.text },
}));
