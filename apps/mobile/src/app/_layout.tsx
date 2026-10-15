import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ToastHost } from "@/components/ui";
import { restoreSession } from "@/features/auth/session";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/stores/authStore";
import { fonts, useTheme } from "@/theme";

// Keep the native splash up until we know if the user is signed in AND the
// fonts are ready, so there's no flash of the login screen or of system fonts.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  const theme = useTheme();

  // Headers, tab bar and screen backgrounds follow our theme (light/dark)
  const navigationTheme = useMemo(() => {
    const base = theme.scheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primaryText,
        background: theme.colors.background,
        card: theme.colors.tabBar,
        text: theme.colors.text,
        border: theme.colors.border,
      },
      fonts: {
        ...base.fonts,
        regular: { fontFamily: fonts.regular, fontWeight: "400" as const },
        medium: { fontFamily: fonts.medium, fontWeight: "500" as const },
        bold: { fontFamily: fonts.bold, fontWeight: "700" as const },
        heavy: { fontFamily: fonts.extrabold, fontWeight: "800" as const },
      },
    };
  }, [theme]);

  useEffect(() => {
    restoreSession();
  }, []);

  // A font that fails to load shouldn't brick the app: fall back to system fonts
  const ready = status !== "loading" && (fontsLoaded || fontError !== null);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    // Required root for swipe gestures
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
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
          {/* Above every screen, so a toast survives navigation (e.g. "Saved" after going back) */}
          <ToastHost />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
