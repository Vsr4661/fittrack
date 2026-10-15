import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="workout/new"
        // No swipe-back: one accidental swipe mid-set shouldn't leave the logger
        options={{ title: "Workout", gestureEnabled: false }}
      />
      <Stack.Screen name="workout/pick-exercise" options={{ title: "Add exercise", presentation: "modal" }} />
      <Stack.Screen name="workout/[id]" options={{ title: "Workout" }} />
    </Stack>
  );
}
