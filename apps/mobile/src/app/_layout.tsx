import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { restoreSession } from "@/features/auth/session";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";

// Keep the native splash up until we know if the user is signed in,
// so they never see a flash of the login screen on launch.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (status !== "loading") SplashScreen.hideAsync();
  }, [status]);

  if (status === "loading") return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      {/* Exactly one group is reachable at a time. When `status` flips (login,
          logout, refresh rejected), Expo Router redirects automatically. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={status === "signedIn"}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
        <Stack.Protected guard={status === "signedOut"}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </QueryClientProvider>
  );
}
