import { Ionicons } from "@expo/vector-icons";
import { Link, Tabs } from "expo-router";
import { Pressable } from "react-native";
import { colors } from "@/theme/legacy";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          headerRight: () => (
            <Link href="/search" asChild>
              <Pressable hitSlop={8} style={{ marginRight: 16 }} accessibilityLabel="Find people">
                <Ionicons name="search" size={22} color={colors.primary} />
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Workouts",
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable hitSlop={12} style={{ marginRight: 16 }} accessibilityLabel="Settings">
                <Ionicons name="settings-outline" size={22} color={colors.primary} />
              </Pressable>
            </Link>
          ),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
