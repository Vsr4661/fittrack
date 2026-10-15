import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  ActionSheet,
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  Skeleton,
  toast,
  WorkoutCardSkeleton,
} from "@/components/ui";
import { makeStyles } from "@/theme";
import { useThemePreference } from "@/theme/themeStore";

/**
 * Dev-only gallery of the design system, for reviewing every component in
 * light and dark mode in one place. Not reachable in production builds.
 */
export default function DevUiScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Gallery />;
}

function Gallery() {
  const styles = useStyles();
  // Dev conveniences for screenshots: /dev-ui?section=Buttons&theme=light
  const params = useLocalSearchParams<{
    section?: string;
    theme?: "light" | "dark" | "system";
    toast?: "success" | "error";
    sheet?: string;
  }>();
  const [chip, setChip] = useState("All");
  const [sheetOpen, setSheetOpen] = useState(false);
  const preference = useThemePreference((s) => s.preference);
  const setPreference = useThemePreference((s) => s.setPreference);

  useEffect(() => {
    if (params.theme) setPreference(params.theme);
  }, [params.theme, setPreference]);

  useEffect(() => {
    if (params.toast === "success") toast.success("Workout saved");
    if (params.toast === "error") toast.error("Couldn't reach the server");
    if (params.sheet) setSheetOpen(true);
  }, [params.toast, params.sheet]);

  const show = (name: string) => !params.section || params.section === name;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {show("Theme") && (
      <Section title="Theme">
        <View style={styles.row}>
          {(["system", "light", "dark"] as const).map((p) => (
            <Chip key={p} label={p} selected={preference === p} onPress={() => setPreference(p)} />
          ))}
        </View>
      </Section>
      )}

      {show("Buttons") && (
      <Section title="Buttons">
        <Button title="Start workout" icon="play" size="lg" onPress={() => toast.success("Workout started")} />
        <Button title="Secondary" variant="secondary" onPress={() => {}} />
        <View style={styles.row}>
          <Button title="Ghost" variant="ghost" fullWidth={false} onPress={() => {}} />
          <Button title="Delete" variant="danger" icon="trash-outline" fullWidth={false} onPress={() => {}} />
        </View>
        <Button title="Saving" loading onPress={() => {}} />
        <Button title="Disabled" disabled onPress={() => {}} />
      </Section>
      )}

      {show("Inputs") && (
      <Section title="Inputs">
        <Input label="Email" icon="mail-outline" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Input label="Password" icon="lock-closed-outline" password placeholder="At least 8 characters" />
        <Input label="Username" icon="at" defaultValue="a!" error="Only letters, numbers and underscores" />
      </Section>
      )}

      {show("Avatars, badges, chips") && (
      <Section title="Avatars, badges, chips">
        <View style={styles.row}>
          <Avatar name="Vaibhav Singh" userId="a1" size={56} />
          <Avatar name="Alice" userId="b2" />
          <Avatar name="Bob Lee" userId="c3" size={32} />
        </View>
        <View style={styles.row}>
          <Badge label="PR" tone="brand" icon="trophy" />
          <Badge label="Private" icon="lock-closed" />
          <Badge label="5-day streak" tone="success" icon="flame" />
          <Badge label="Warmup" tone="warning" />
        </View>
        <View style={styles.row}>
          {["All", "Chest", "Back", "Legs"].map((c) => (
            <Chip key={c} label={c} selected={chip === c} onPress={() => setChip(c)} />
          ))}
        </View>
      </Section>
      )}

      {show("Cards") && (
      <Section title="Cards">
        <Card onPress={() => toast.info("Card pressed")} accessibilityLabel="Example card">
          <Text style={styles.cardTitle}>Push day</Text>
          <Text style={styles.muted}>Bench Press · Overhead Press · Dips</Text>
        </Card>
        <Card variant="flat">
          <Text style={styles.muted}>Flat card (inside other cards)</Text>
        </Card>
      </Section>
      )}

      {show("Skeletons") && (
      <Section title="Skeletons">
        <WorkoutCardSkeleton showAuthor />
        <View style={styles.row}>
          <Skeleton circle height={44} />
          <Skeleton width={160} height={16} />
        </View>
      </Section>
      )}

      {show("Feedback") && (
      <Section title="Feedback">
        <View style={styles.row}>
          <Button title="Success toast" fullWidth={false} variant="secondary" onPress={() => toast.success("Workout saved")} />
          <Button title="Error toast" fullWidth={false} variant="secondary" onPress={() => toast.error("Couldn't reach the server")} />
        </View>
        <Button title="Open action sheet" variant="secondary" icon="ellipsis-horizontal" onPress={() => setSheetOpen(true)} />
      </Section>
      )}

      {show("Empty state") && (
      <Section title="Empty state">
        <Card>
          <EmptyState icon="barbell-outline" title="No workouts yet" message="Log your first workout and it'll show up here." action={{ label: "Start workout", onPress: () => {} }} />
        </Card>
      </Section>
      )}

      <ActionSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Workout"
        actions={[
          { label: "Share", icon: "share-outline", onPress: () => toast.info("Share") },
          { label: "Delete workout", icon: "trash-outline", destructive: true, onPress: () => toast.error("Deleted") },
        ]}
      />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { padding: t.spacing.lg, gap: t.spacing.xl, paddingBottom: t.spacing.xxxl },
  section: { gap: t.spacing.md },
  sectionTitle: { ...t.typography.overline, color: t.colors.textMuted },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.spacing.sm },
  cardTitle: { ...t.typography.heading, color: t.colors.text },
  muted: { ...t.typography.body, color: t.colors.textMuted },
}));
