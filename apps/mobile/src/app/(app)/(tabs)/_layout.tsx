import { Ionicons } from "@expo/vector-icons";
import { Link, Tabs } from "expo-router";
import { Pressable } from "react-native";
import { TabBar, USE_LARGE_TITLE } from "@/components/ui";
import { useTheme } from "@/theme";

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ tabBarActiveTintColor: colors.primaryText }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerShown: false, // the dashboard draws its own greeting header
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          headerShown: !USE_LARGE_TITLE, // iOS: large title in the list; Android: top app bar
          tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
          headerRight: () => (
            <Link href="/search" asChild>
              <Pressable hitSlop={12} style={{ marginRight: 16 }} accessibilityLabel="Find people">
                <Ionicons name="search" size={22} color={colors.primaryText} />
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Workouts",
          headerShown: !USE_LARGE_TITLE,
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} />,
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable hitSlop={12} style={{ marginRight: 16 }} accessibilityLabel="Settings">
                <Ionicons name="settings-outline" size={22} color={colors.primaryText} />
              </Pressable>
            </Link>
          ),
        }}
      />
    </Tabs>
  );
}
