import { useMemo } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import { darkColors, lightColors, type ColorTokens } from "./colors";
import { useThemePreference } from "./themeStore";
import { fonts, MIN_TOUCH, radius, shadows, spacing, typography } from "./tokens";

export { fonts, MIN_TOUCH, radius, shadows, spacing, typography };
export type { ColorTokens };

export interface Theme {
  scheme: "light" | "dark";
  colors: ColorTokens;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
}

const lightTheme: Theme = { scheme: "light", colors: lightColors, typography, spacing, radius, shadows };
const darkTheme: Theme = { scheme: "dark", colors: darkColors, typography, spacing, radius, shadows };

/** The active theme: the Settings choice, or the phone's appearance when "system". */
export function useTheme(): Theme {
  const preference = useThemePreference((s) => s.preference);
  const system = useColorScheme();
  const scheme = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;
  return scheme === "dark" ? darkTheme : lightTheme;
}

/**
 * Theme-aware styles. Declared once at module level, used as a hook:
 *
 *   const useStyles = makeStyles((t) => ({ card: { backgroundColor: t.colors.surface } }));
 *   function Card() { const styles = useStyles(); ... }
 *
 * Styles are rebuilt only when the theme changes (light <-> dark), not on
 * every render, so this costs nothing during normal re-renders.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: Theme) => T): () => T {
  return function useStyles() {
    const theme = useTheme();
    return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
  };
}
