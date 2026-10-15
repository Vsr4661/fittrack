import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, useWindowDimensions, View } from "react-native";
import { Badge, Card } from "@/components/ui";
import { formatWeight, muscleLabel } from "@/features/workouts/format";
import { makeStyles, textScale, useTheme } from "@/theme";
import type { PersonalRecord } from "../types";

const NEW_FOR_DAYS = 7;

/** One personal record: the lift, big and tabular; tap through to the workout it came from. */
export function PrCard({ record, now }: { record: PersonalRecord; now: Date }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const achieved = new Date(record.achievedAt);
  const date = achieved.toLocaleDateString(undefined, { day: "numeric", month: "short", year: achieved.getFullYear() === now.getFullYear() ? undefined : "numeric" });
  // "New" = set in the last week, and not just a first-ever session (see newRecordsFrom)
  const isNew = record.sessionCount > 1 && now.getTime() - achieved.getTime() < NEW_FOR_DAYS * 24 * 60 * 60 * 1000;
  const lift = `${formatWeight(record.weightGrams)} × ${record.reps}`;
  // Past the chrome cap there's no room for name and lift side by side: stack them
  const stacked = useWindowDimensions().fontScale > textScale.chrome;

  return (
    <Card
      onPress={() => router.push(`/workout/${record.workoutId}`)}
      accessibilityLabel={`${record.exercise.name} record: ${lift}, ${date}${isNew ? ", new this week" : ""}. Opens the workout`}
    >
      <View style={[styles.row, stacked && styles.rowStacked]}>
        <View style={styles.trophy}>
          <Ionicons name="trophy" size={20} color={colors.brand} />
        </View>
        <View style={styles.text}>
          <Text style={styles.name} numberOfLines={2}>
            {record.exercise.name}
          </Text>
          <View style={styles.meta}>
            <Badge label={muscleLabel[record.exercise.muscleGroup]} />
            {isNew ? <Badge label="New" tone="brand" icon="sparkles" /> : null}
          </View>
        </View>
        <View style={[styles.liftBlock, stacked && styles.liftBlockStacked]}>
          <Text style={styles.lift} maxFontSizeMultiplier={textScale.display}>
            {lift}
          </Text>
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: "row", alignItems: "center", gap: t.spacing.md },
  rowStacked: { flexWrap: "wrap" },
  trophy: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: t.spacing.xs },
  name: { ...t.typography.bodyStrong, color: t.colors.text },
  meta: { flexDirection: "row", gap: t.spacing.xs, flexWrap: "wrap" },
  liftBlock: { alignItems: "flex-end" },
  liftBlockStacked: { width: "100%", alignItems: "flex-start" },
  lift: { ...t.typography.number, color: t.colors.text },
  date: { ...t.typography.caption, color: t.colors.textMuted },
}));
