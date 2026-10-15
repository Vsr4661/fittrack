import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { Text, View } from "react-native";
import { Card } from "@/components/ui";
import { makeStyles, useTheme } from "@/theme";

const SHORTCUTS: { title: string; hint: string; icon: keyof typeof Ionicons.glyphMap; href: Href }[] = [
  { title: "Progress", hint: "Charts & records", icon: "stats-chart", href: "/progress" },
  { title: "Leaderboard", hint: "You vs friends", icon: "trophy", href: "/leaderboard" },
];

/** Home's entry points to Progress and Leaderboard (they're stack screens, not extra tabs). */
export function HomeShortcuts() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {SHORTCUTS.map((s) => (
        <Card key={s.title} style={styles.card} onPress={() => router.push(s.href)} accessibilityLabel={`${s.title}: ${s.hint}`}>
          <View style={styles.iconCircle}>
            <Ionicons name={s.icon} size={20} color={colors.brand} />
          </View>
          <View style={styles.text}>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.hint}>{s.hint}</Text>
          </View>
        </Card>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  // Wraps to one per line at large text sizes instead of squeezing
  row: { flexDirection: "row", flexWrap: "wrap", gap: t.spacing.md },
  card: { flex: 1, minWidth: 150, flexDirection: "row", alignItems: "center", gap: t.spacing.md },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1 },
  title: { ...t.typography.bodyStrong, color: t.colors.text },
  hint: { ...t.typography.caption, color: t.colors.textMuted },
}));
