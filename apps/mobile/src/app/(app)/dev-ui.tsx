import { File, Paths } from "expo-file-system";
import { Redirect, router, Stack, useLocalSearchParams } from "expo-router";
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
import { prepareImage } from "@/features/uploads/uploadImage";
import { useWorkoutDraft } from "@/features/workouts/draftStore";
import { startPhotoUpload } from "@/features/workouts/photoUploads";
import { useExercises } from "@/features/workouts/hooks";
import { useRestTimer } from "@/features/workouts/restTimer";
import { makeStyles } from "@/theme";
import LoginScreen from "../(auth)/login";
import RegisterScreen from "../(auth)/register";
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
    preview?: "login" | "register";
    /** "1" = screenshot mode for previews: no dev header, no banner (README images) */
    shot?: "1";
    seed?: "workout" | "cardio" | "photo";
    /** seed=photo: an image URL the simulator can reach */
    from?: string;
  }>();
  const exercises = useExercises();
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

  // ?seed=workout: replace the draft with a realistic in-progress workout (real
  // catalog ids, so it can still be saved) and open the logger. Dev only.
  useEffect(() => {
    if (params.seed !== "workout" || !exercises.data) return;
    const find = (name: string) => exercises.data.find((e) => e.name === name);
    const bench = find("Bench Press");
    const squat = find("Back Squat");
    if (!bench || !squat) return;
    const d = useWorkoutDraft.getState();
    d.discard();
    d.start();
    d.setTitle("Push day");
    d.addExercise(bench);
    d.addExercise(squat);
    const [b, s] = useWorkoutDraft.getState().draft!.exercises;
    d.updateSet(b!.key, b!.sets[0]!.key, { weightKg: "40", reps: "10", isWarmup: true, done: true });
    d.addSet(b!.key);
    const b2 = useWorkoutDraft.getState().draft!.exercises[0]!.sets[1]!;
    d.updateSet(b!.key, b2.key, { weightKg: "80", reps: "8", isWarmup: false, done: true });
    d.addSet(b!.key);
    const b3 = useWorkoutDraft.getState().draft!.exercises[0]!.sets[2]!;
    d.updateSet(b!.key, b3.key, { weightKg: "82.5", reps: "", done: false });
    d.updateSet(s!.key, s!.sets[0]!.key, { weightKg: "100", reps: "5" });
    useRestTimer.getState().start(75);
    router.replace("/workout/new");
  }, [params.seed, exercises.data]);

  // seed=cardio: a run in progress (distance + time rows), to check the cardio logger. Dev only.
  useEffect(() => {
    if (params.seed !== "cardio" || !exercises.data) return;
    const running = exercises.data.find((e) => e.name === "Running");
    if (!running) return;
    const d = useWorkoutDraft.getState();
    d.discard();
    d.start();
    d.setTitle("Morning run");
    d.addExercise(running);
    const r = useWorkoutDraft.getState().draft!.exercises[0]!;
    d.updateSet(r.key, r.sets[0]!.key, { distanceKm: "1", duration: "8:00", isWarmup: true, done: true });
    d.addSet(r.key);
    const r2 = useWorkoutDraft.getState().draft!.exercises[0]!.sets[1]!;
    d.updateSet(r.key, r2.key, { distanceKm: "5.2", duration: "28:30", isWarmup: false, done: false });
    router.replace("/workout/new");
  }, [params.seed, exercises.data]);

  // seed=photo&from=<url>: runs the REAL photo pipeline (resize/re-encode ->
  // upload link -> PUT to storage) on a downloaded image, because the simulator
  // can't be tapped through the system photo picker. Dev only.
  useEffect(() => {
    if (params.seed !== "photo" || !params.from) return;
    (async () => {
      const file = await File.downloadFileAsync(params.from!, new File(Paths.cache, `seed-${Date.now()}.jpg`));
      const uri = await prepareImage({ uri: file.uri, width: 1600, height: 1600 }, "WORKOUT_PHOTO");
      useWorkoutDraft.getState().start();
      const [photo] = useWorkoutDraft.getState().addPhotos([uri]);
      if (photo) void startPhotoUpload(photo);
      router.replace("/workout/new");
    })().catch((err: unknown) => toast.error(`seed=photo failed: ${String(err)}`));
  }, [params.seed, params.from]);

  // Render auth screens while signed in, for screenshots without logging the
  // developer out. The login <-> register links can't open from here: those
  // routes only exist while signed OUT (Stack.Protected in app/_layout), so a
  // banner says so instead of letting the preview pass for the real screen.
  if (params.preview === "login" || params.preview === "register") {
    if (params.shot === "1") {
      return (
        <>
          <Stack.Screen options={{ headerShown: false }} />
          {params.preview === "login" ? <LoginScreen /> : <RegisterScreen />}
        </>
      );
    }
    return (
      <View style={styles.previewScreen}>
        <Stack.Screen options={{ title: params.preview === "login" ? "Login preview" : "Register preview" }} />
        <View style={styles.previewBanner} accessibilityRole="alert">
          <Text style={styles.previewText}>
            Preview while signed in: links between login and register are off. Log out (Settings) to try the real flow.
          </Text>
        </View>
        {params.preview === "login" ? <LoginScreen /> : <RegisterScreen />}
      </View>
    );
  }

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
  previewScreen: { flex: 1 },
  previewBanner: { paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.sm, backgroundColor: t.colors.warningSoft },
  previewText: { ...t.typography.caption, color: t.colors.warning, textAlign: "center" },
  content: { padding: t.spacing.lg, gap: t.spacing.xl, paddingBottom: t.spacing.xxxl },
  section: { gap: t.spacing.md },
  sectionTitle: { ...t.typography.overline, color: t.colors.textMuted },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: t.spacing.sm },
  cardTitle: { ...t.typography.heading, color: t.colors.text },
  muted: { ...t.typography.body, color: t.colors.textMuted },
}));
