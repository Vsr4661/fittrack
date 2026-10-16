---
name: FitTrack
description: A social fitness tracker built to be used mid-set — calm surfaces, orange only where effort happens.
colors:
  effort-orange: "#FF5A1F"
  ember: "#D63F0A"
  ember-text: "#C93A08"
  ember-text-dark: "#FF7A45"
  ember-wash: "#FFEDE5"
  ember-on-wash: "#B83508"
  ember-deep: "#9A2C06"
  chalk: "#F8FAFC"
  surface-white: "#FFFFFF"
  chalk-dust: "#F1F5F9"
  chalk-line: "#E2E8F0"
  ink: "#111827"
  graphite: "#5B6B7F"
  iron: "#0B0F17"
  cast-iron: "#161C27"
  iron-dust: "#1F2937"
  iron-line: "#334155"
  bone: "#F1F5F9"
  pewter: "#94A3B8"
  done-green: "#166534"
  done-wash: "#ECFDF3"
  done-green-dark: "#4ADE80"
  warmup-amber: "#92400E"
  warmup-wash: "#FEF3C7"
  warmup-amber-dark: "#F59E0B"
  danger-red: "#B91C1C"
  danger-wash: "#FEE2E2"
  danger-red-dark: "#F87171"
typography:
  display:
    fontFamily: "Inter_800ExtraBold"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: "38px"
    letterSpacing: "-0.5px"
  title:
    fontFamily: "Inter_700Bold"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "30px"
    letterSpacing: "-0.3px"
  heading:
    fontFamily: "Inter_700Bold"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "24px"
  body:
    fontFamily: "Inter_400Regular"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "22px"
  body-strong:
    fontFamily: "Inter_600SemiBold"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "22px"
  label:
    fontFamily: "Inter_600SemiBold"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "18px"
  caption:
    fontFamily: "Inter_500Medium"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "17px"
  overline:
    fontFamily: "Inter_600SemiBold"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.6px"
  number:
    fontFamily: "Inter_700Bold"
    fontSize: "18px"
    fontWeight: 700
    fontFeature: "tnum"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  pill: "999px"
spacing:
  xxs: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
  xxxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.surface-white}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "48px"
  button-primary-large:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.lg}"
    height: "56px"
  button-secondary:
    backgroundColor: "{colors.chalk-dust}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "48px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ember-text}"
    rounded: "{rounded.md}"
    height: "48px"
  button-danger:
    backgroundColor: "{colors.danger-wash}"
    textColor: "{colors.danger-red}"
    rounded: "{rounded.md}"
    height: "48px"
  button-disabled:
    backgroundColor: "{colors.chalk-dust}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "50px"
  search-field:
    backgroundColor: "{colors.chalk-dust}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-flat:
    backgroundColor: "{colors.chalk-dust}"
    rounded: "{rounded.lg}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.chalk-dust}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.pill}"
  badge:
    backgroundColor: "{colors.chalk-dust}"
    textColor: "{colors.graphite}"
    typography: "{typography.overline}"
    rounded: "{rounded.pill}"
    padding: "3px 8px"
  badge-brand:
    backgroundColor: "{colors.ember-wash}"
    textColor: "{colors.ember-on-wash}"
    rounded: "{rounded.pill}"
  tab-indicator:
    backgroundColor: "{colors.ember-wash}"
    rounded: "{rounded.pill}"
    height: "32px"
---

# Design System: FitTrack

> Source of truth is the code: `src/theme/` (tokens) and `src/components/ui/`
> (components). This file explains them; if the two ever disagree, the code
> wins and this file is stale. Light-theme values are the frontmatter's
> defaults; dark-theme counterparts carry a `-dark` suffix or an Iron name.

## Overview

**Creative North Star: "The Training Floor"**

A good gym floor is calm. The walls are plain, the equipment is where you
expect it, and the only bright things are the ones that matter: the clock,
the plates, the person next to you hitting a lift. FitTrack's screens work
the same way. Surfaces are quiet Chalk (light) or Iron (dark), type is a
single family set firmly, and orange appears only where effort happens:
the Start button, a completed ring, a streak, the active tab.

The app is used in two very different moments. Mid-workout, with sweaty hands
and divided attention, everything must read at a glance and be hittable
without aiming: big targets, numbers in tabular figures, one deliberate tick
per set with a haptic to confirm it. Between workouts, the feed and profiles
can breathe a little more, but they stay inside the same calm world rather
than switching to a louder "social" skin.

Controls feel confident and tactile: solid fills, a slight shrink under the
finger, a real haptic on the moments that count. Depth is a soft lift, never
drama. The world is native on each platform where conventions differ (touch
targets, transient feedback, titles), and identical everywhere else.

**Key Characteristics:**
- Quiet slate surfaces; orange reserved for effort and the one primary action.
- Two oranges with strictly separate jobs: Effort Orange for graphics, Ember for fills with text.
- One typeface (Inter), heavy at the top of the hierarchy, tabular figures for every number.
- Large touch targets (44pt iOS / 48dp Android minimum) and text that scales with the OS setting.
- Soft lift in light mode, tonal layering plus hairline borders in dark mode.
- Contrast is measured on every surface a color sits on, not eyeballed.

## Colors

A cool slate neutral world with one hot accent family, used sparingly.

### Primary
- **Effort Orange** (`effort-orange`): the brand as *graphics*: progress
  rings, the active-tab dot, icons, the input focus border, decorative hero
  shapes. White on it measures only 3.12:1, so it never carries text.
- **Ember** (`ember`): the brand as a *fill*: primary buttons, the selected
  chip, the start of the hero gradient. White labels on it measure 4.59:1.
- **Ember Text** (`ember-text`, dark: `ember-text-dark`): orange *as text*
  (links, "See all", ghost buttons). Darker than Ember so small orange text
  passes AA on every light surface (≥4.52:1); in dark mode the lighter
  `ember-text-dark` measures 7.42:1 on Iron.
- **Ember Wash / Ember on Wash** (`ember-wash`, `ember-on-wash`): tinted
  backgrounds for brand badges and the tab indicator, with text dark enough
  (5.21:1) to sit on them. Dark mode uses a 16% Effort Orange wash instead.
- **Ember Deep** (`ember-deep`): the far end of the hero gradient
  (Ember → #B83508 → Ember Deep) on the auth hero and profile cover. That
  gradient is orange in both themes, so its text is always white.

### Neutral
- **Chalk** (`chalk`) / **Iron** (`iron`): page background.
- **Surface White** (`surface-white`) / **Cast Iron** (`cast-iron`): cards, inputs, sheets.
- **Chalk Dust** (`chalk-dust`) / **Iron Dust** (`iron-dust`): muted tiles, chips, secondary buttons, skeleton base.
- **Chalk Line** (`chalk-line`) / **Iron Line** (`iron-line`): borders and dividers.
- **Ink** (`ink`) / **Bone** (`bone`): primary text.
- **Graphite** (`graphite`) / **Pewter** (`pewter`): secondary text, captions,
  placeholders, inactive icons. Graphite was darkened from slate-500 because
  that shade passed on white but failed on Chalk and Chalk Dust; it now
  measures ≥4.80:1 on every light surface.

- **Scrim** (`scrim`, 72% Iron in both themes) with **On Scrim** white: the only
  background for text or icons sitting ON a photo ("+2", "1 / 3", remove, upload
  progress). The photo, not the theme, is the background, so it is measured
  against the worst case: white on Scrim over a pure-white photo is 7.8:1.

### Status
- **Done Green** (`done-green` / `done-green-dark`, wash `done-wash`): completed sets, success toasts.
- **Warmup Amber** (`warmup-amber` / `warmup-amber-dark`, wash `warmup-wash`): warmup sets.
- **Danger Red** (`danger-red` / `danger-red-dark`, wash `danger-wash`): destructive actions, errors.
- In light mode the text shades are the dark 700–800 steps (5.3–5.6:1 on their
  washes); the 500/600 steps measured 1.9–4.0:1 and failed. In dark mode,
  white on the light Done Green is only 1.74:1, so its foreground is Ink.

### Named Rules
**The Two Oranges Rule.** Effort Orange draws; Ember carries words. If
something has text on it or in it, it is Ember (fill) or Ember Text (type),
never Effort Orange.

**The Every Surface Rule.** A text color is approved only after it measures
≥4.5:1 on *every* surface it can sit on (Surface White, Chalk, Chalk Dust,
and any wash), not just white. Two tokens once shipped that passed on white only.

**The Effort Rule.** Orange marks effort and the one primary action on a
screen. A screen with orange in more than a handful of places has lost its signal.

## Typography

**Display Font:** Inter (ExtraBold 800)
**Body Font:** Inter (Regular 400 / Medium 500 / SemiBold 600 / Bold 700)

**Character:** One screen-native family does all the work; hierarchy comes
from weight and size, not from a second typeface. Heavy, tightly tracked
display and title sizes give the energy; plain 16pt body keeps it calm.

### Hierarchy
- **Display** (800, 32/38, −0.5): the Home greeting name, the hero wordmark, big stat numbers.
- **Title** (700, 24/30, −0.3): screen-level titles, the workout title (set at 28/34 on the detail screen).
- **Heading** (700, 18/24): card and section headings, exercise names.
- **Body** (400, 16/22): running text, inputs, comments.
- **Body Strong** (600, 16/22): names in lists, emphasized body.
- **Label** (600, 14/18): buttons, chips, field labels.
- **Caption** (500, 13/17): metadata ("@test · Thu, 15 Oct"), stat labels, hints.
- **Overline** (600, 12/16, +0.6, uppercase): badges, column headers (SET / KG / REPS).
- **Number** (700, 18, tabular figures): every number that updates or sits in
  a column: weights, reps, timers, counts.

### Named Rules
**The Tabular Rule.** Any number that changes or aligns with others uses
tabular figures (`fontVariant: ["tabular-nums"]`), so "82.5" and "100" take
the same width per digit and timers don't jitter.

**The Text Scale Rule.** Text follows the OS text-size setting. Content
scales fully; text inside fixed-width slots is capped with
`maxFontSizeMultiplier`: chrome (tab labels, column headers, badges, stat
labels) at 1.3×, numbers inside fixed controls and already-huge display text
at 1.6×. In narrow slots, prefer `numberOfLines={1}` + `adjustsFontSizeToFit`
over wrapping mid-word.

## Layout

- **Phone-only, portrait-only** (owner decisions; reasons in PRODUCT.md). Tablets
  run in iPhone compatibility mode until real tablet layouts are designed.
- **Gutter:** 16pt (`spacing.lg`) screen padding; content capped at 720pt
  wide and centered.
- **Rhythm:** a 4pt scale (2, 4, 8, 12, 16, 24, 32, 48). Sections on a screen
  are separated by 16pt; groups inside a card by 12pt.
- **Safe areas and keyboard:** every screen respects safe-area insets; forms
  live in `KeyboardScreen` so the focused field stays visible.
- **Lists:** long or growing lists (workouts, feed) use FlashList; short ones
  (search results, the exercise catalog) use FlatList. Rows are at least 56pt tall.
- **Platform titles:** iOS shows large titles on the Feed and Workouts tabs;
  Android uses its standard top app bar.

## Elevation & Depth

A soft lift. In light mode, raised cards sit on a faint, cool shadow so they
read as objects on the Chalk floor; nothing floats dramatically. In dark mode
shadows are invisible on near-black, so depth comes from lighter surfaces
(Iron → Cast Iron → Iron Dust) plus a 1px Iron Line border on raised cards.
On Android, shadows are expressed as `elevation`.

### Shadow Vocabulary
- **sm** (y 1, blur 3, 8% `#0F172A`; Android elevation 1): raised cards, stat tiles, primary buttons.
- **md** (y 4, blur 12, 10%; elevation 4): the hero logo tile, floating controls.
- **lg** (y 10, blur 24, 14%; elevation 10): things that float over the page: the auth card overlapping the hero, the rest-timer panel, toasts.

### Named Rules
**The Soft Lift Rule.** Shadows only say "this is a separate object". They
never get bigger to signal importance; importance comes from color and size.

## Shapes

Gently rounded, never sharp and never blobby. Controls use a 12pt radius,
cards and large buttons 16pt, sheets 24pt, and anything pill-shaped (chips,
badges, the tab indicator) is fully round. Inputs have a 1.5pt border so the
field edge survives bright light and sweaty glances. Avatars are circles,
colored per user from a fixed palette.

## Components

### Buttons
Confident and tactile: a solid fill, a slight shrink under the finger.
- **Shape:** gently rounded (12pt); the large size is 56pt tall with 16pt corners.
- **Primary:** Ember fill, white Label text, sm shadow. One per screen.
- **Secondary:** Chalk Dust fill, Ink text.
- **Ghost:** no fill, Ember Text label: low-emphasis actions like "See all".
- **Danger / Danger Ghost:** Danger Wash fill (or none) with Danger Red text.
- **Disabled:** Chalk Dust fill, Graphite label, no shadow.
- **Press:** scales to ~0.97 on a stiff spring (damping 20, stiffness 400)
  and springs back. Loading swaps the label for a spinner and keeps the width.
- **Minimum height:** 48pt (44pt + 4), always ≥ the platform touch minimum.

### Chips
- **Style:** fully round pill, Chalk Dust fill, Ink Label text, min 36pt tall
  (grows with text size instead of clipping).
- **State:** selected chips switch to an Ember fill with white text.

### Cards / Containers
- **Corner Style:** 16pt.
- **Background:** Surface White (raised) or Chalk Dust (flat).
- **Shadow Strategy:** sm in light mode; 1px Iron Line border in dark mode.
- **Internal Padding:** 16pt, with 12pt between groups.
- **Press:** pressable cards share the button's scale effect.

### Inputs / Fields
- **Style:** Surface White, 1.5pt Chalk Line border, 12pt corners, ≥50pt
  tall, optional leading icon, label above in Label type.
- **Focus:** the border turns Effort Orange.
- **Error:** Danger Red border plus the message below; a hint slot (e.g. the
  live "0/160" bio counter) shares that line.
- **Password:** an eye toggle; **Search** fields are a borderless Chalk Dust
  variant with their own clear button (iOS's built-in one doesn't exist on Android).

### Navigation
- **Tab bar:** custom, four tabs (Home · Feed · Workouts · Profile). The
  active tab sits in an Ember Wash pill that slides between tabs on a spring
  (damping 18, stiffness 220), or jumps when Reduce Motion is on. Labels are
  capped at 1.3× text size; each tab is at least 52pt tall.
- **Headers:** native stack headers; modals (Edit profile, Add exercise) are sheets.

### Feedback
- **Toast:** a dark Ink pill (Iron Dust in dark mode) with a tone icon. iOS
  shows a rounded banner sliding in from the top; Android shows a
  small-radius snackbar at the bottom (Android behavior not yet verified on a device).
- **Haptics:** a light tap on button presses and sheet actions, a selection
  tick on choosing, a success notification on completing a set, a warning
  when a set can't be ticked yet (no reps) or is deleted, an error buzz with error toasts. Never on scroll or
  passive changes.
- **Loading / Empty / Error:** skeletons that match the final layout; empty
  states with an icon in an Ember Wash circle, a title and one helpful
  sentence; error states with the real message and a Retry button.

### Photos
- **Photo** (`components/ui/Photo.tsx`): cover-cropped on a Chalk Dust placeholder,
  150 ms fade (none with Reduce Motion), cached by storage key.
- **Feed card cover:** the first photo at 16:10 with 12pt corners, between the
  exercise list and the stat tiles; a Scrim "+N" pill when there are more.
- **Detail gallery:** full-width 4:3 pages, 16pt corners, a Scrim "1 / 3"
  counter (clearer than dots at a glance).
- **Logger strip:** 84pt thumbnails, a dashed "Add" tile in Ember Text, a Scrim
  overlay with a spinner or retry icon while uploading or failed, and a small
  remove dot whose touch area is 44pt.
- **Avatar:** the photo in a circle over the initials, so initials show while it
  loads or if it fails.

### Progress Ring (signature)
The weekly-goal and rest-timer ring: a Chalk Dust track with an Effort Orange
arc that fills over 900ms (ease-out cubic), instant under Reduce Motion. Its
center number is a tabular Number and the ring scales with the text size.

### Set Row (signature)
The mid-workout row: set number (or "W" for warmups, in Warmup Amber), two
inputs in large tabular figures (weight and reps, or distance and time for a
Cardio exercise, with the column labels switching to KM / TIME), and a
completion tick. Completing a
set fills the row with Done Wash and fires a haptic; swiping left reveals Delete.

### Logo & App Icon (signature)
A barbell drawn as a rising line, tilted up 20° like a progress chart:
training and tracking in one shape. The app icon is a white mark on the
Ember hero gradient. The splash screen shows a white mark on Ember, or an
Effort Orange mark on Iron in dark mode, so a night launch doesn't flash
bright orange. The login tile uses the same geometry (the `Logo` component).
It's built from few, chunky parts on purpose, so it still reads at 40–60px.
Every asset is generated by `scripts/generate-brand-assets.py`; change the
mark there, never by editing the PNGs.

### Weekly Bar Chart (signature)
Twelve weekly bars on the Progress screen, built from plain Views (no chart
library). Past weeks are solid Graphite (Pewter in dark mode), and only the
current week is Effort Orange, so "now" stands out without a legend and every
bar passes 3:1 against its card. Empty weeks keep a 3pt Chalk Dust stub,
because a gap in training is information. Bars grow from their bottom edge
(scaleY, 500ms ease-out cubic, 30ms stagger left to right); there's no motion
under Reduce Motion. Date labels sit under every fourth week, and the last one
reads "Now". Screen readers get one summary label instead of twelve bars.

### Podium (signature)
The Leaderboard's top three in classic 2nd · 1st · 3rd order. First place
stands on the screen's one Ember block, with white rank text and a trophy in
Effort Orange; the others stand on Chalk Dust blocks. Blocks rise on a spring
(damping 14, stiffness 140): 3rd, then 2nd, then 1st, so the winner arrives
last. Block heights belong to the slot, not the rank, so tied ranks (1, 1, 3)
still form a podium. The viewer's avatar gets an Effort Orange ring and the
label "You". The podium appears only with three or more people.

### Confetti (signature)
Reserved for a genuine personal record: never for a first-ever session, never
for routine saves. Forty theme-colored pieces fall for 2.2s, all driven by one
shared value. They're decorative only: hidden from screen readers, they never
block touches, and they aren't rendered under Reduce Motion. The Ember Wash
"New personal record!" banner is a live region, and with the success haptic
it carries the message.

## Do's and Don'ts

### Do:
- **Do** use semantic color roles from `@/theme` (`surface`, `textMuted`, `primaryText`) and `makeStyles`, never hex values in screens.
- **Do** put white text only on Ember (4.59:1) or the hero gradient.
- **Do** measure every new text/background pair on every surface it can sit on, in both themes, before shipping it.
- **Do** keep every touch target at least `MIN_TOUCH` (44pt iOS / 48dp Android).
- **Do** use tabular figures for any number that changes or sits in a column.
- **Do** respect Reduce Motion: springs and fills jump straight to their end state.
- **Do** give every screen loading, empty and error (with retry) states built from the shared components.
- **Do** say what a number counts when it isn't obvious (e.g. "Only workouts you can see are counted"), as Progress and Leaderboard do.

### Don't:
- **Don't** put text on Effort Orange (3.12:1); it is for graphics only.
- **Don't** add a second typeface or a second icon set (Ionicons is the only one).
- **Don't** use shadows to signal importance or rely on them in dark mode.
- **Don't** set a fixed `height` on anything that contains text; use `minHeight` so large text grows the control.
- **Don't** use confetti or celebration for anything but a real personal record; rarity is what makes it mean something.
- **Don't** fake features: unfinished things are labeled (e.g. a "Soon" badge), never decorated to look real.
