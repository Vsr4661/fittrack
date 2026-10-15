import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { formatWeight } from "@/features/workouts/format";
import { haptics } from "@/lib/haptics";
import { makeStyles, useTheme } from "@/theme";
import { useChartWindow, useProgress } from "../hooks";
import type { PersonalRecord } from "../types";
import { newRecordsFrom } from "../weeks";

/**
 * Records set by a just-saved workout. Reuses the Progress screen's query
 * (same key), so it costs one request and warms the Progress screen too.
 * Disabled unless `enabled` (only right after saving, not on every visit).
 */
export function useNewRecords(workoutId: string, enabled: boolean): PersonalRecord[] {
  const { since } = useChartWindow();
  const progress = useProgress(since, enabled); // no request at all when not just saved
  return enabled && progress.data ? newRecordsFrom(workoutId, progress.data.personalRecords) : [];
}

export function NewRecordBanner({ records }: { records: PersonalRecord[] }) {
  const styles = useStyles();
  const { colors } = useTheme();

  useEffect(() => {
    if (records.length > 0) haptics.success();
  }, [records.length]);

  if (records.length === 0) return null;
  const title = records.length === 1 ? "New personal record!" : `${records.length} new personal records!`;

  return (
    // A live region: VoiceOver/TalkBack announce it when it appears, since the confetti is silent
    <View style={styles.banner} accessible accessibilityLiveRegion="polite" accessibilityLabel={`${title} ${records.map(describe).join(". ")}`}>
      <View style={styles.icon}>
        <Ionicons name="trophy" size={22} color={colors.onPrimary} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {records.map((r) => (
          <Text key={r.exercise.id} style={styles.line}>
            {describe(r)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const describe = (r: PersonalRecord) => `${r.exercise.name}: ${formatWeight(r.weightGrams)} × ${r.reps}`;

const useStyles = makeStyles((t) => ({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.primarySoft,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: t.spacing.xxs },
  title: { ...t.typography.heading, color: t.colors.onPrimarySoft },
  line: { ...t.typography.bodyStrong, color: t.colors.text },
}));
