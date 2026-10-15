import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "@/components/ui/Logo";
import { gradients, makeStyles } from "@/theme";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  /** Login gets the tall hero; register is form-heavy, so its hero is compact. */
  hero?: "tall" | "compact";
  children: ReactNode;
  footer?: ReactNode;
}

// Hero text is always solid white on gradients.hero (faded white = 3.74:1).

/**
 * Shared shell for login/register: a gradient hero with the brand, and a form
 * card that overlaps it. Scrolls and lifts above the keyboard on small phones.
 */
export function AuthLayout({ title, subtitle, hero = "tall", children, footer }: AuthLayoutProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + (hero === "tall" ? 48 : 20) }, hero === "compact" && styles.heroCompact]}
        >
          {/* Decorative energy: soft circles in the bright brand orange */}
          <View style={[styles.blob, styles.blobTop]} />
          <View style={[styles.blob, styles.blobBottom]} />

          <View style={styles.logo} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {/* The app-icon mark, so the logo you land on matches the icon you tapped */}
            <Logo size={hero === "tall" ? 44 : 34} color={gradients.hero[0]} />
          </View>
          <Text style={[styles.brand, hero === "compact" && styles.brandCompact]} accessibilityRole="header">
            FitTrack
          </Text>
          {hero === "tall" ? <Text style={styles.tagline}>Train. Track. Share.</Text> : null}
        </LinearGradient>

        {/* The gutter lives on a wrapper: width 100% + side margins on the card
            itself would make it wider than the screen */}
        <View style={styles.cardGutter}>
          <View style={styles.card}>
            <View style={styles.heading}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            {children}
          </View>
        </View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: t.colors.background },
  scroll: { flexGrow: 1 },
  hero: {
    paddingHorizontal: t.spacing.xl,
    paddingBottom: t.spacing.xxxl + t.spacing.xl, // room for the card to overlap
    alignItems: "center",
    gap: t.spacing.sm,
    overflow: "hidden",
  },
  heroCompact: { paddingBottom: t.spacing.xxxl + t.spacing.sm },
  blob: { position: "absolute", borderRadius: 999, backgroundColor: gradients.heroAccent, opacity: 0.35 },
  blobTop: { width: 220, height: 220, top: -80, right: -60 },
  blobBottom: { width: 160, height: 160, bottom: -40, left: -50 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: t.radius.lg,
    backgroundColor: gradients.onHero,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: t.spacing.xs,
    ...t.shadows.md,
  },
  brand: { ...t.typography.display, color: gradients.onHero },
  brandCompact: { fontSize: 26, lineHeight: 32 },
  tagline: { ...t.typography.bodyStrong, color: gradients.onHero },
  cardGutter: { marginTop: -t.spacing.xxxl, paddingHorizontal: t.spacing.lg },
  card: {
    padding: t.spacing.xl,
    gap: t.spacing.lg,
    borderRadius: t.radius.xl,
    backgroundColor: t.colors.surface,
    ...t.shadows.lg,
    ...(t.scheme === "dark" ? { borderWidth: 1, borderColor: t.colors.border } : null),
    // Tablets: keep the form a comfortable reading width instead of stretching
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  heading: { gap: t.spacing.xs },
  title: { ...t.typography.title, color: t.colors.text },
  subtitle: { ...t.typography.body, color: t.colors.textMuted },
  footer: { alignItems: "center", paddingTop: t.spacing.xl, paddingHorizontal: t.spacing.lg },
}));
