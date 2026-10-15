import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useLogout } from "@/features/auth/hooks";
import { makeStyles, MIN_TOUCH, useTheme } from "@/theme";
import { useThemePreference, type ThemePreference } from "@/theme/themeStore";

const appearanceOptions: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "system", label: "Match my phone", icon: "phone-portrait-outline" },
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
];

export default function SettingsScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const preference = useThemePreference((s) => s.preference);
  const setPreference = useThemePreference((s) => s.setPreference);
  const logout = useLogout(); // same hook the profile used; only the button moved here

  const confirmLogout = () =>
    Alert.alert("Log out?", "You'll need your email and password to log back in.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => logout.mutate() },
    ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Appearance</Text>
      <View style={styles.card} accessibilityRole="radiogroup">
        {appearanceOptions.map((option, i) => {
          const selected = option.value === preference;
          return (
            <Pressable
              key={option.value}
              onPress={() => setPreference(option.value)}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && styles.pressed]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Ionicons name={option.icon} size={20} color={colors.textMuted} />
              <Text style={styles.rowLabel}>{option.label}</Text>
              {selected ? <Ionicons name="checkmark" size={22} color={colors.primaryText} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, styles.sectionGap]}>Account</Text>
      <View style={styles.card}>
        <Pressable
          onPress={confirmLogout}
          disabled={logout.isPending}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={[styles.rowLabel, { color: colors.danger }]}>Log out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { padding: t.spacing.lg, gap: t.spacing.sm },
  sectionTitle: { ...t.typography.overline, color: t.colors.textMuted, marginLeft: t.spacing.xs },
  sectionGap: { marginTop: t.spacing.lg },
  card: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, overflow: "hidden", ...t.shadows.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.md,
    minHeight: MIN_TOUCH + 8,
    paddingHorizontal: t.spacing.lg,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: t.colors.border },
  pressed: { backgroundColor: t.colors.surfaceMuted },
  rowLabel: { ...t.typography.body, color: t.colors.text, flex: 1 },
}));
