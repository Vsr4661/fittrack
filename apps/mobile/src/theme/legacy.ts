// TEMPORARY: the pre-redesign tokens. Each screen migrates to `@/theme`
// (theme-aware, light/dark) in its own redesign step; delete this file once
// nothing imports it.

// One place for design tokens, so screens never hard-code colors or spacing.
export const colors = {
  background: "#FFFFFF",
  surface: "#F4F5F7",
  text: "#111827",
  textMuted: "#6B7280",
  border: "#D1D5DB",
  primary: "#2563EB",
  primaryText: "#FFFFFF",
  danger: "#DC2626",
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const radius = { md: 10 } as const;
