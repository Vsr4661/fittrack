import type { Tabs } from "expo-router";
import { useEffect, useState, type ComponentProps } from "react";
import { Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { haptics } from "@/lib/haptics";
import { makeStyles, MIN_TOUCH, useTheme } from "@/theme";

// Typed from the public Tabs component, not an internal build path, so an
// expo-router update can't silently break the import.
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const PILL_WIDTH = 56;

/**
 * Custom bottom tab bar: icons + labels with a soft orange pill that slides
 * to the active tab (UI-thread spring), plus a selection haptic.
 * Navigation behaviour mirrors the default bar: tabPress event, re-tap on the
 * active tab is left to the screen (e.g. scroll to top), long-press event.
 */
export function TabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [tabWidth, setTabWidth] = useState(0);
  const x = useSharedValue(0);

  useEffect(() => {
    if (tabWidth === 0) return;
    const target = state.index * tabWidth + (tabWidth - PILL_WIDTH) / 2;
    x.value = reduceMotion ? target : withSpring(target, { damping: 18, stiffness: 220 });
  }, [state.index, tabWidth, reduceMotion, x]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const onLayout = (e: LayoutChangeEvent) => setTabWidth(e.nativeEvent.layout.width / state.routes.length);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      <View style={styles.row} onLayout={onLayout}>
        {tabWidth > 0 ? <Animated.View style={[styles.pill, pillStyle]} /> : null}

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const focused = state.index === index;
          const color = focused ? colors.primaryText : colors.textMuted;
          const label = typeof options.title === "string" ? options.title : route.name;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              haptics.selection();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            >
              <View style={styles.iconSlot}>{options.tabBarIcon?.({ focused, color, size: 24 })}</View>
              <Text style={[styles.label, { color }, focused && styles.labelFocused]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    backgroundColor: t.colors.tabBar,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    paddingTop: t.spacing.sm,
  },
  row: { flexDirection: "row" },
  pill: {
    position: "absolute",
    top: 0,
    width: PILL_WIDTH,
    height: 32,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primarySoft,
  },
  tab: { flex: 1, alignItems: "center", minHeight: MIN_TOUCH + 8, gap: t.spacing.xxs },
  iconSlot: { height: 32, justifyContent: "center" },
  label: { ...t.typography.caption, fontSize: 11 },
  labelFocused: { fontFamily: t.typography.label.fontFamily },
}));
