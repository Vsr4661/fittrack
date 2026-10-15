import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* Swipe-back stays enabled (HIG): the draft auto-saves, so leaving the
          logger loses nothing and "Resume workout" brings you straight back */}
      <Stack.Screen name="workout/new" options={{ title: "Workout" }} />
      <Stack.Screen name="workout/pick-exercise" options={{ title: "Add exercise", presentation: "modal" }} />
      <Stack.Screen name="workout/[id]" options={{ title: "Workout" }} />
      <Stack.Screen name="user/[username]" options={{ title: "Profile" }} />
      <Stack.Screen name="search" options={{ title: "Find people" }} />
      <Stack.Screen name="edit-profile" options={{ title: "Edit profile", presentation: "modal" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="dev-ui" options={{ title: "UI kit (dev)" }} />
    </Stack>
  );
}
