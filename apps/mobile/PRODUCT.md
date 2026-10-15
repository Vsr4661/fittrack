# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

One React Native (Expo SDK 57) codebase for iOS and Android. The owner's
intent is to adapt patterns per OS where conventions differ; today the UI is
one shared design and has only been verified on the iOS simulator.

## Users

People who train across **all kinds of fitness**: strength training in the
gym, plus cardio, running and classes. They use the app in two situations:

- **Mid-workout**: logging sets between efforts, glancing at the phone on a
  bench or in a hand, often with sweaty hands and little attention to spare.
- **Between workouts**: browsing a feed of friends' training, reacting and
  commenting, checking their own history and streak.

## Product Purpose

FitTrack is a social fitness tracker: log workouts, see your history and
consistency, and share training with people you follow.

It is also the owner's **resume/portfolio project**. Success includes the
owner being able to explain and defend every design and engineering decision
in interviews, so choices must be deliberate and explainable, not decorative.

## Positioning

**Undecided.** The owner has not committed to what makes FitTrack different
from Hevy or Strava (candidates discussed: social-first logging, or the
fastest focused logger). Future work must not invent a positioning claim.

## Operating Context

- Workouts are built on the phone and saved in one request when finished; a
  draft persists if the app is killed mid-session.
- A rest timer runs between sets; completing a set is a deliberate tick.
- Each workout has a visibility: everyone, followers only, or only me.
- Social loop: follow people, a feed of followed users' workouts, likes,
  comments, user search, profiles.
- Home shows a day streak and a weekly workout goal (set by the user).

## Capabilities and Constraints

- **Built:** email/password accounts; strength logging (weight x reps,
  warmup sets); exercise catalog; workout history and detail; visibility;
  follows, feed, likes, comments, search, profiles, edit profile; streak and
  weekly goal (computed on-device); rest timer; light/dark/system theme.
- **API supports, app does not yet:** time and distance sets. Cardio
  exercises are currently hidden in the logger. Given the "all activities"
  audience, this is a known gap, not a deliberate exclusion.
- **Not built yet:** Progress (charts, personal records) and Leaderboard need
  new read-only API endpoints; Apple/Google sign-in is shown as "Coming soon"
  and does nothing; real-time updates, photo uploads, push notifications and a
  paid tier (Stripe) are planned later phases.
- **Units:** kilograms only (stored as integer grams). No lb setting yet.
- **Runtime:** Expo Go during development, so only Expo-bundled native
  modules are available; Metro runs on port 8082.
- **Process constraints** (from the owner): UI work must not change business
  logic or API calls unless agreed; no new packages without asking.

## Brand Commitments

- Name: **FitTrack**.
- Owner-chosen: an **energetic orange** brand color and the **Inter** typeface.
- Current UI copy includes the tagline "Train. Track. Share." (written during
  the redesign, not separately confirmed by the owner as a brand line).

## Evidence on Hand

- No real users, testimonials, metrics, press or case studies exist. Do not
  fabricate any.
- No logo or illustration assets beyond the Expo template icons; the current
  mark is an icon glyph in a tile.
- Design-system code is the visual source of truth today
  (`src/theme/`, `src/components/ui/`); there is no DESIGN.md yet.

## Product Principles

1. **Usable mid-effort.** Anything used during a workout must work at a glance
   with large targets and minimal typing.
2. **Every activity counts.** The product serves all fitness, not only lifting;
   new features should not assume weights and reps are the only measure.
3. **Privacy is per workout and explicit.** Sharing is the user's choice each
   time, and the chosen visibility is always visible.
4. **Honest data.** Show what is real; label estimates and unfinished features
   (e.g. "Coming soon") rather than faking them.
5. **Explainable by design.** Every choice should have a reason the owner can
   state in an interview.

## Accessibility & Inclusion

Owner requirements: WCAG AA contrast (measured, not eyeballed), minimum
44x44pt touch targets, accessibility labels on icons and buttons, respect for
the OS Reduce Motion setting, safe areas and keyboard avoidance, and layouts
that work on small phones and tablets.
