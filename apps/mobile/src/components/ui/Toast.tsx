import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { Platform, Pressable, Text } from "react-native";
import Animated, { FadeOutDown, FadeOutUp, SlideInDown, SlideInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import { haptics } from "@/lib/haptics";
import { makeStyles, useTheme } from "@/theme";

type ToastTone = "success" | "error" | "info";

interface ToastState {
  current: { id: number; message: string; tone: ToastTone } | null;
  show: (message: string, tone?: ToastTone) => void;
  hide: () => void;
}

let nextId = 0;

// A store (not React context) so toasts can be fired from anywhere,
// including mutation callbacks: toast.success("Saved")
const useToastStore = create<ToastState>()((set) => ({
  current: null,
  show: (message, tone = "info") => set({ current: { id: nextId++, message, tone } }),
  hide: () => set({ current: null }),
}));

export const toast = {
  success: (message: string) => {
    haptics.success();
    useToastStore.getState().show(message, "success");
  },
  error: (message: string) => {
    haptics.error();
    useToastStore.getState().show(message, "error");
  },
  info: (message: string) => useToastStore.getState().show(message, "info"),
};

const DURATION_MS = 3000;

// Platform idiom (adaptive): iOS shows a banner from the top; Android shows a
// Material snackbar at the bottom, above the navigation bar. (Android: unverified.)
const IS_ANDROID = Platform.OS === "android";
const ANDROID_NAV_BAR_CLEARANCE = 88; // keep the snackbar above the bottom tab bar

/** Mounted once at the root. Shows one toast at a time; a new one replaces the old. */
export function ToastHost() {
  const current = useToastStore((s) => s.current);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(hide, DURATION_MS);
    return () => clearTimeout(timer); // a newer toast restarts the timer
  }, [current, hide]);

  if (!current) return null;

  const icon = { success: "checkmark-circle", error: "alert-circle", info: "information-circle" } as const;
  const iconColor = { success: colors.success, error: colors.danger, info: colors.primaryText }[current.tone];

  return (
    <Animated.View
      key={current.id} // re-run the enter animation for each new toast
      entering={IS_ANDROID ? SlideInDown.duration(220) : SlideInUp.springify().damping(18)}
      exiting={IS_ANDROID ? FadeOutDown.duration(180) : FadeOutUp.duration(200)}
      style={[
        styles.wrapper,
        IS_ANDROID ? { bottom: insets.bottom + ANDROID_NAV_BAR_CLEARANCE } : { top: insets.top + 8 },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={hide}
        style={styles.toast}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite" // screen readers announce it
        accessibilityHint="Tap to dismiss"
      >
        <Ionicons name={icon[current.tone]} size={22} color={iconColor} />
        <Text style={styles.message} numberOfLines={3}>
          {current.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { position: "absolute", left: t.spacing.lg, right: t.spacing.lg, zIndex: 1000, alignItems: "center" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.md,
    maxWidth: 520, // don't stretch across a whole tablet
    alignSelf: "stretch",
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    // Material snackbars use a small corner radius; iOS banners are rounder
    borderRadius: IS_ANDROID ? t.radius.sm / 2 : t.radius.lg,
    backgroundColor: t.scheme === "dark" ? t.colors.surfaceMuted : t.colors.text,
    ...t.shadows.lg,
  },
  message: { ...t.typography.bodyStrong, color: t.scheme === "dark" ? t.colors.text : t.colors.textInverse, flex: 1 },
}));
