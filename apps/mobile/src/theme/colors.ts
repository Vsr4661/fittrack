// Semantic color tokens. Screens use roles ("surface", "textMuted"), never raw
// hex values, so light/dark mode and future rebrands change in one place.
//
// Contrast (WCAG AA) was measured, not eyeballed:
//   white on brand #FF5A1F       = 3.12:1  -> OK for icons/rings (3:1), NOT for text
//   white on primary #D63F0A     = 4.59:1  -> buttons with white labels
//   primaryText #D63F0A on white = 4.59:1;  #FF7A45 on dark bg = 7.42:1
//   textMuted #64748B on white   = 4.76:1;  #94A3B8 on dark card = 6.66:1
//   Text on tinted badge/button backgrounds needs darker shades in light mode:
//   success #166534 5.56:1, warning #92400E 5.50:1, danger #B91C1C 5.30:1,
//   onPrimarySoft #B83508 5.21:1 (the 500/600 shades measured 1.9–4.0:1: fail)

const palette = {
  orange500: "#FF5A1F", // brand: graphics only (rings, indicators, icons)
  orange600: "#D63F0A", // fills that carry white text
  orange400: "#FF7A45", // orange text/icons on dark backgrounds
  slate950: "#0B0F17",
  slate900: "#111827",
  slate850: "#161C27",
  slate800: "#1F2937",
  slate700: "#334155",
  slate500: "#64748B",
  slate400: "#94A3B8",
  slate200: "#E2E8F0",
  slate100: "#F1F5F9",
  slate50: "#F8FAFC",
  white: "#FFFFFF",
  green400: "#4ADE80",
  amber500: "#F59E0B",
  red400: "#F87171",
} as const;

export interface ColorTokens {
  background: string;
  surface: string; // cards, inputs
  surfaceMuted: string; // chips, segmented controls, skeleton base
  border: string;
  text: string;
  textMuted: string;
  textInverse: string;
  brand: string; // graphics: rings, active tab indicator, icons
  primary: string; // filled buttons (white label)
  primaryText: string; // orange text/links on the background
  onPrimary: string;
  primarySoft: string; // tinted backgrounds (selected chip, badges)
  onPrimarySoft: string; // text/icons on primarySoft
  success: string;
  warning: string;
  danger: string;
  dangerSoft: string;
  overlay: string; // modal/bottom-sheet backdrop
  skeleton: string;
  skeletonHighlight: string;
  tabBar: string;
}

export const lightColors: ColorTokens = {
  background: palette.slate50,
  surface: palette.white,
  surfaceMuted: palette.slate100,
  border: palette.slate200,
  text: palette.slate900,
  textMuted: palette.slate500,
  textInverse: palette.white,
  brand: palette.orange500,
  primary: palette.orange600,
  primaryText: palette.orange600,
  onPrimary: palette.white,
  primarySoft: "#FFEDE5",
  onPrimarySoft: "#B83508",
  success: "#166534",
  warning: "#92400E",
  danger: "#B91C1C",
  dangerSoft: "#FEE2E2",
  overlay: "rgba(15, 23, 42, 0.45)",
  skeleton: palette.slate200,
  skeletonHighlight: palette.slate100,
  tabBar: palette.white,
};

export const darkColors: ColorTokens = {
  background: palette.slate950,
  surface: palette.slate850,
  surfaceMuted: palette.slate800,
  border: palette.slate700,
  text: palette.slate100,
  textMuted: palette.slate400,
  textInverse: palette.slate900,
  brand: palette.orange500,
  primary: palette.orange600,
  primaryText: palette.orange400,
  onPrimary: palette.white,
  primarySoft: "rgba(255, 90, 31, 0.16)",
  onPrimarySoft: palette.orange400,
  success: palette.green400,
  warning: palette.amber500,
  danger: palette.red400,
  dangerSoft: "rgba(248, 113, 113, 0.16)",
  overlay: "rgba(0, 0, 0, 0.6)",
  skeleton: palette.slate800,
  skeletonHighlight: palette.slate700,
  tabBar: palette.slate900,
};
