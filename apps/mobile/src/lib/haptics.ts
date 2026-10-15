import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// One vocabulary for touch feedback, so the same action always feels the same.
// Fire-and-forget: a failed vibration must never break the action itself.
const run = (fn: () => Promise<void>) => {
  if (Platform.OS === "web") return;
  fn().catch(() => {});
};

export const haptics = {
  /** Picking something: tabs, chips, toggles. */
  selection: () => run(() => Haptics.selectionAsync()),
  /** A normal button press. */
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Completing something meaningful: finishing a set or a workout. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
