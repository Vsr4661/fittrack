import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { Badge, Card, Confetti, ErrorState, KeyboardScreen, Skeleton, toast } from "@/components/ui";
import { useMe } from "@/features/auth/hooks";
import { AuthorRow } from "@/features/social/components/AuthorRow";
import { CommentsSection } from "@/features/social/components/CommentsSection";
import { useWorkoutRoom } from "@/features/realtime/useWorkoutRoom";
import { NewRecordBanner, useNewRecords } from "@/features/stats/components/NewRecordBanner";
import { LikeButton } from "@/features/social/components/LikeButton";
import { formatClock, formatDistance, formatDuration, formatWeight, formatWorkoutDate, loadStat } from "@/features/workouts/format";
import { PhotoGallery } from "@/features/workouts/components/PhotoGallery";
import { useDeleteWorkout, useWorkout } from "@/features/workouts/hooks";
import type { Visibility, WorkoutSet } from "@/features/workouts/types";
import { toApiError } from "@/lib/apiError";
import { makeStyles, MIN_TOUCH, textScale, useTheme } from "@/theme";

const visibilityBadge: Record<Visibility, { label: string; icon: "globe-outline" | "people-outline" | "lock-closed-outline" }> = {
  PUBLIC: { label: "Everyone", icon: "globe-outline" },
  FOLLOWERS: { label: "Followers", icon: "people-outline" },
  PRIVATE: { label: "Only me", icon: "lock-closed-outline" },
};

export default function WorkoutDetailScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { id, celebrate } = useLocalSearchParams<{ id: string; celebrate?: string }>();
  const workout = useWorkout(id);
  const newRecords = useNewRecords(id, celebrate === "1"); // before the early returns: hooks run every render
  useWorkoutRoom(id); // live likes and comments while this screen is open
  const me = useMe();
  const deleteWorkout = useDeleteWorkout();

  if (workout.isPending) return <DetailSkeleton />;
  if (workout.isError) return <ErrorState error={workout.error} onRetry={() => workout.refetch()} />;

  const w = workout.data;
  const isOwner = me.data?.id === w.userId;

  // Unchanged flow; success/failure feedback now via toast
  const confirmDelete = () =>
    Alert.alert("Delete workout?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteWorkout.mutate(w.id, {
            onSuccess: () => {
              toast.success("Workout deleted");
              router.back();
            },
            onError: (err) => toast.error(toApiError(err).message),
          }),
      },
    ]);

  const vis = visibilityBadge[w.visibility];

  return (
    <KeyboardScreen style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: isOwner
            ? () => (
                <Pressable onPress={confirmDelete} hitSlop={8} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Delete workout">
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <NewRecordBanner records={newRecords} />
        <AuthorRow author={w.author} subtitle={formatWorkoutDate(w.startedAt)} />

        <View style={styles.titleBlock}>
          <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={textScale.display}>
            {w.title}
          </Text>
          {/* Privacy is always visible (product principle 3) */}
          <Badge label={vis.label} icon={vis.icon} />
        </View>

        <PhotoGallery photos={w.photos} />

        <View style={styles.stats}>
          {w.stats.durationSec !== null ? <Stat icon="time-outline" label="Duration" value={formatDuration(w.stats.durationSec)} /> : null}
          <Stat icon={loadStat(w.stats).icon} label={loadStat(w.stats).label} value={loadStat(w.stats).value} />
          <Stat icon="layers-outline" label="Sets" value={String(w.stats.setCount)} />
        </View>

        {w.exercises.map((entry) => {
          let working = 0; // working-set numbering skips warmups, like the logger
          return (
            <Card key={entry.id}>
              <Text style={styles.exerciseName}>{entry.exercise.name}</Text>
              <View style={styles.sets}>
                {entry.sets.map((set) => {
                  if (!set.isWarmup) working++;
                  return (
                    <View key={set.id} style={styles.setRow} accessible accessibilityLabel={`${set.isWarmup ? "Warmup set" : `Set ${working}`}: ${describeSet(set)}`}>
                      <View style={[styles.setBadge, set.isWarmup && styles.setBadgeWarmup]}>
                        <Text style={[styles.setBadgeText, set.isWarmup && styles.setBadgeTextWarmup]} maxFontSizeMultiplier={textScale.chrome}>{set.isWarmup ? "W" : working}</Text>
                      </View>
                      <Text style={styles.setText} maxFontSizeMultiplier={textScale.numeric}>
                        {describeSet(set)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          );
        })}

        <View style={styles.likeRow}>
          <LikeButton workoutId={w.id} social={w.social} />
        </View>

        <CommentsSection workoutId={w.id} myUserId={me.data?.id} workoutOwnerId={w.userId} />
      </ScrollView>
      {/* Over the whole screen, outside the ScrollView so it doesn't scroll away */}
      {newRecords.length > 0 ? <Confetti /> : null}
    </KeyboardScreen>
  );
}

function describeSet(set: WorkoutSet): string {
  if (set.reps !== null && set.weightGrams !== null) return `${formatWeight(set.weightGrams)} × ${set.reps}`;
  if (set.reps !== null) return `${set.reps} reps`;
  // Cardio: "5.2 km in 28:30". The clock format keeps the seconds a runner cares about
  if (set.distanceM !== null && set.durationSec !== null) return `${formatDistance(set.distanceM)} in ${formatClock(set.durationSec)}`;
  if (set.distanceM !== null) return formatDistance(set.distanceM);
  if (set.durationSec !== null) return formatClock(set.durationSec);
  return "—";
}

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      {/* A third of the screen wide: one line each, shrinking before it would
          break mid-word ("Duratio/n") at the largest text sizes */}
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={textScale.display}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit maxFontSizeMultiplier={textScale.chrome}>
        {label}
      </Text>
    </View>
  );
}

function DetailSkeleton() {
  const styles = useStyles();
  return (
    <View style={[styles.screen, styles.content]} accessibilityRole="progressbar" accessibilityLabel="Loading workout">
      <View style={styles.setRow}>
        <Skeleton circle height={36} />
        <Skeleton width={140} height={14} />
      </View>
      <Skeleton width="70%" height={26} />
      <View style={styles.stats}>
        <Skeleton height={72} width="31%" radius={16} />
        <Skeleton height={72} width="31%" radius={16} />
        <Skeleton height={72} width="31%" radius={16} />
      </View>
      <Skeleton height={140} radius={16} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { padding: t.spacing.lg, gap: t.spacing.lg, paddingBottom: t.spacing.xxl },
  headerButton: { minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
  titleBlock: { gap: t.spacing.sm, alignItems: "flex-start" }, // badge hugs its label
  title: { ...t.typography.title, fontSize: 28, lineHeight: 34, color: t.colors.text },
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
  exerciseName: { ...t.typography.heading, color: t.colors.text },
  sets: { gap: t.spacing.sm },
  setRow: { flexDirection: "row", alignItems: "center", gap: t.spacing.md },
  setBadge: {
    minWidth: 32,
    minHeight: 32,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  setBadgeWarmup: { backgroundColor: t.colors.warningSoft },
  setBadgeText: { ...t.typography.label, color: t.colors.text },
  setBadgeTextWarmup: { color: t.colors.warning },
  setText: { ...t.typography.number, fontSize: 17, color: t.colors.text },
  likeRow: { flexDirection: "row" },
}));
