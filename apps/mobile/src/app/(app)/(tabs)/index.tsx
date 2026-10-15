import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActionSheet, Avatar, Button, Card, EmptyState, ErrorState, ProgressRing, useCountUp, WorkoutCardSkeleton } from "@/components/ui";
import { useMe } from "@/features/auth/hooks";
import { useWeeklyGoal } from "@/features/dashboard/goalStore";
import { computeStreak, greeting, workoutsThisWeek } from "@/features/dashboard/stats";
import { WorkoutCard } from "@/features/workouts/components/WorkoutCard";
import { useWorkoutDraft } from "@/features/workouts/draftStore";
import { useWorkoutHistory } from "@/features/workouts/hooks";
import { makeStyles, useTheme } from "@/theme";

const RECENT_COUNT = 3;

export default function HomeScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const history = useWorkoutHistory(); // same query as the Workouts tab: shared cache, no extra request
  const hasDraft = useWorkoutDraft((s) => s.draft !== null);
  const goal = useWeeklyGoal((s) => s.goal);
  const setGoal = useWeeklyGoal((s) => s.setGoal);
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);

  const workouts = useMemo(() => history.data?.pages.flatMap((p) => p.items) ?? [], [history.data]);
  // Computed on-device from history already loaded (first page = latest 20).
  // Exact all-time stats come with the stats endpoint in the Progress step.
  const { streak, thisWeek } = useMemo(() => {
    const now = new Date();
    const startedAts = workouts.map((w) => w.startedAt);
    return { streak: computeStreak(startedAts, now), thisWeek: workoutsThisWeek(startedAts, now) };
  }, [workouts]);

  const startOrResume = () => {
    useWorkoutDraft.getState().start(); // no-op if one is already in progress
    router.push("/workout/new");
  };

  const firstName = me.data?.displayName.split(" ")[0];

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        refreshControl={<RefreshControl refreshing={history.isRefetching} onRefresh={() => history.refetch()} />}
      >
        {/* ── Greeting ─────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={styles.date}>
              {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            </Text>
            <Text style={styles.greeting} accessibilityRole="header">
              {greeting(new Date())}
              {firstName ? `,\n${firstName}` : ""}
            </Text>
          </View>
          {me.data ? (
            <Link href="/profile" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="Your profile" hitSlop={8}>
                <Avatar name={me.data.displayName} userId={me.data.id} size={48} />
              </Pressable>
            </Link>
          ) : null}
        </View>

        {/* ── Stats row ────────────────────────────── */}
        <View style={styles.statsRow}>
          <StreakCard streak={streak} loading={history.isPending} />
          <WeeklyCard done={thisWeek} goal={goal} loading={history.isPending} onPress={() => setGoalSheetOpen(true)} />
        </View>

        <Button title={hasDraft ? "Resume workout" : "Start workout"} icon={hasDraft ? "play-forward" : "play"} size="lg" onPress={startOrResume} />

        {/* ── Recent workouts ──────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent workouts</Text>
          {workouts.length > 0 ? (
            <Link href="/history" style={styles.seeAll} accessibilityRole="link">
              See all
            </Link>
          ) : null}
        </View>

        {history.isPending ? (
          <>
            <WorkoutCardSkeleton />
            <WorkoutCardSkeleton />
          </>
        ) : history.isError ? (
          <ErrorState error={history.error} onRetry={() => history.refetch()} />
        ) : workouts.length === 0 ? (
          <Card>
            <EmptyState icon="barbell-outline" title="No workouts yet" message="Your first session is one tap away. Log it and it shows up here." />
          </Card>
        ) : (
          workouts.slice(0, RECENT_COUNT).map((w) => <WorkoutCard key={w.id} workout={w} />)
        )}
      </ScrollView>

      <ActionSheet
        open={goalSheetOpen}
        onClose={() => setGoalSheetOpen(false)}
        title="Weekly goal"
        actions={[2, 3, 4, 5, 6].map((n) => ({
          label: `${n} workouts a week${n === goal ? "  ✓" : ""}`,
          icon: n === goal ? "checkmark-circle" : "ellipse-outline",
          onPress: () => setGoal(n),
        }))}
      />
    </View>
  );
}

function StreakCard({ streak, loading }: { streak: number; loading: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const shown = useCountUp(loading ? 0 : streak);
  const message = streak === 0 ? "Train today to start one" : streak === 1 ? "Keep it going tomorrow" : "Don't break the chain";

  return (
    <Card style={styles.statCard}>
      <View style={styles.flameCircle}>
        <Ionicons name="flame" size={22} color={colors.brand} />
      </View>
      <View accessible accessibilityLabel={`${streak} day streak. ${message}`}>
        <Text style={styles.bigNumber}>{shown}</Text>
        <Text style={styles.statLabel}>day streak</Text>
      </View>
      <Text style={styles.statHint}>{message}</Text>
    </Card>
  );
}

function WeeklyCard({ done, goal, loading, onPress }: { done: number; goal: number; loading: boolean; onPress: () => void }) {
  const styles = useStyles();
  const reached = done >= goal;

  return (
    <Card style={styles.statCard} onPress={onPress} accessibilityLabel={`${done} of ${goal} workouts this week. Tap to change your goal`}>
      <ProgressRing progress={loading ? 0 : done / goal} size={84} strokeWidth={9} accessibilityLabel={`Weekly goal ${done} of ${goal}`}>
        <Text style={styles.ringText}>
          {done}
          <Text style={styles.ringGoal}>/{goal}</Text>
        </Text>
      </ProgressRing>
      <Text style={styles.statLabel}>{reached ? "Goal reached! 🎉" : "this week"}</Text>
      {/* Says the card is tappable: otherwise nobody discovers the goal setting */}
      <Text style={styles.statHint}>Tap to change goal</Text>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { paddingHorizontal: t.spacing.lg, paddingBottom: t.spacing.xxl, gap: t.spacing.lg, maxWidth: 720, width: "100%", alignSelf: "center" },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: t.spacing.md },
  date: { ...t.typography.overline, color: t.colors.textMuted },
  greeting: { ...t.typography.display, color: t.colors.text, marginTop: t.spacing.xs },
  statsRow: { flexDirection: "row", gap: t.spacing.md },
  statCard: { flex: 1, alignItems: "center", gap: t.spacing.sm, paddingVertical: t.spacing.xl },
  flameCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  bigNumber: { ...t.typography.display, fontSize: 40, lineHeight: 44, color: t.colors.text, textAlign: "center", fontVariant: ["tabular-nums"] },
  statLabel: { ...t.typography.label, color: t.colors.textMuted, textAlign: "center" },
  statHint: { ...t.typography.caption, color: t.colors.textMuted, textAlign: "center" },
  ringText: { ...t.typography.title, color: t.colors.text, fontVariant: ["tabular-nums"] },
  ringGoal: { ...t.typography.bodyStrong, color: t.colors.textMuted },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: t.spacing.sm },
  sectionTitle: { ...t.typography.heading, color: t.colors.text },
  seeAll: { ...t.typography.label, color: t.colors.primaryText, padding: t.spacing.sm },
}));
