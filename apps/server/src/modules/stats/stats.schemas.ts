import { z } from "zod";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Charts look back at most a year: bounds the query no matter what the client sends. */
const MAX_LOOKBACK_MS = 366 * DAY_MS;

export const progressQuerySchema = z.object({
  // The CLIENT sends the start of its first chart week (Monday 00:00 in the
  // user's own time zone), so the server never has to know time zones.
  since: z.iso
    .datetime({ offset: true })
    .transform((s) => new Date(s))
    .refine((d) => d.getTime() >= Date.now() - MAX_LOOKBACK_MS, { message: "since can be at most a year ago" })
    .refine((d) => d.getTime() <= Date.now(), { message: "since can't be in the future" }),
});
export type ProgressQuery = z.infer<typeof progressQuerySchema>;

export const PERIOD_DAYS = { "7d": 7, "30d": 30 } as const;

export const leaderboardQuerySchema = z.object({
  // Rolling windows ("last 7 days"), not calendar weeks: "this week" would
  // start at a different moment for every viewer's time zone.
  period: z.enum(["7d", "30d"]).default("7d"),
  metric: z.enum(["volume", "workouts"]).default("volume"),
});
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
