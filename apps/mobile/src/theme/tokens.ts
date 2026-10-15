import { Platform, type TextStyle, type ViewStyle } from "react-native";

// ─── Typography ────────────────────────────────────────
// Inter: built for screens, and its tabular figures keep weights, reps and
// timers aligned in columns ("82.5" and "100" take the same width per digit).

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
} as const;

export const typography = {
  display: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 17 },
  overline: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: "uppercase" },
  // Numbers that update or sit in columns: weights, reps, timers, counts
  number: { fontFamily: fonts.bold, fontSize: 18, fontVariant: ["tabular-nums"] },
} satisfies Record<string, TextStyle>;

// ─── Spacing & radius ──────────────────────────────────
// A 4pt scale: every gap is a multiple of 4, which keeps layouts rhythmic.

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

/**
 * Minimum touch target: Apple HIG 44pt, Material 48dp. Per platform, because
 * each OS's users (and its guideline) expect its own minimum.
 */
export const MIN_TOUCH = Platform.select({ ios: 44, default: 48 });

/**
 * Text-scaling policy (Dynamic Type / Android font scale). Content scales
 * fully; dense UI chrome inside fixed-width slots is capped, the way iOS's own
 * tab bar labels stay small (iOS shows the Large Content Viewer instead).
 * Values are multipliers of the base size, passed as maxFontSizeMultiplier.
 */
export const textScale = {
  /** Tab labels, column headers, badges, timer pills: small, space-bound. */
  chrome: 1.3,
  /** Numbers inside fixed controls: set inputs, ring centers. */
  numeric: 1.6,
  /** Already-huge display text: greeting name, stat numbers. */
  display: 1.6,
} as const;

// ─── Shadows ───────────────────────────────────────────
// iOS uses shadow* props, Android uses elevation. Dark mode relies on lighter
// surfaces for depth instead (shadows are invisible on near-black).

function shadow(y: number, blur: number, opacity: number, elevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: { shadowColor: "#0F172A", shadowOffset: { width: 0, height: y }, shadowRadius: blur, shadowOpacity: opacity },
    default: { elevation },
  });
}

export const shadows = {
  none: {} as ViewStyle,
  sm: shadow(1, 3, 0.08, 1),
  md: shadow(4, 12, 0.1, 4),
  lg: shadow(10, 24, 0.14, 10),
};
