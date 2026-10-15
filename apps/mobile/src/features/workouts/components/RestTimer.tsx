import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { ProgressRing } from "@/components/ui";
import { haptics } from "@/lib/haptics";
import { makeStyles, MIN_TOUCH } from "@/theme";
import { formatClock } from "../format";
import { remainingSec, useRestTimer } from "../restTimer";

/** Floating rest countdown shown after a set is ticked off. Hidden when idle. */
export function RestTimer() {
  const endsAt = useRestTimer((s) => s.endsAt);
  if (endsAt === null) return null;
  return <RunningTimer endsAt={endsAt} />;
}

function RunningTimer({ endsAt }: { endsAt: number }) {
  const styles = useStyles();
  const durationSec = useRestTimer((s) => s.durationSec);
  const { adjust, stop } = useRestTimer.getState();
  const [now, setNow] = useState(Date.now());
  const left = remainingSec(endsAt, now);

  useEffect(() => {
    // 250ms ticks keep the seconds display from lagging up to a second behind
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (left === 0) {
      haptics.success(); // the phone buzzes: you don't need to watch the screen
      stop();
    }
  }, [left, stop]);

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} exiting={FadeOutDown.duration(180)} style={styles.bar}>
      <ProgressRing
        progress={left / durationSec}
        size={56}
        strokeWidth={6}
        durationMs={250}
        accessibilityLabel={`Rest timer, ${left} seconds left`}
      >
        <Text style={styles.ringText}>{formatClock(left)}</Text>
      </ProgressRing>

      <View style={styles.flex}>
        <Text style={styles.title}>Rest</Text>
      </View>

      <TimerButton label="−15" accessibilityLabel="Remove 15 seconds" onPress={() => adjust(-15)} />
      <TimerButton label="+15" accessibilityLabel="Add 15 seconds" onPress={() => adjust(15)} />
      <TimerButton label="Skip" accessibilityLabel="Skip rest" onPress={stop} />
    </Animated.View>
  );
}

function TimerButton({ label, onPress, accessibilityLabel }: { label: string; onPress: () => void; accessibilityLabel: string }) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.spacing.sm,
    marginHorizontal: t.spacing.lg,
    marginBottom: t.spacing.sm,
    padding: t.spacing.sm,
    paddingRight: t.spacing.md,
    borderRadius: t.radius.xl,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...t.shadows.lg,
  },
  flex: { flex: 1 },
  ringText: { ...t.typography.caption, fontFamily: t.typography.number.fontFamily, color: t.colors.text, fontVariant: ["tabular-nums"] },
  title: { ...t.typography.bodyStrong, color: t.colors.text },
  button: {
    minWidth: MIN_TOUCH,
    height: MIN_TOUCH,
    paddingHorizontal: t.spacing.sm,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.6 },
  buttonText: { ...t.typography.label, color: t.colors.text, fontVariant: ["tabular-nums"] },
}));
