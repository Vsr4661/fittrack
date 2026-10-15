import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { workoutKeys } from "@/features/workouts/hooks";
import { statsApi } from "./api";
import type { LeaderboardMetric, LeaderboardPeriod } from "./types";
import { chartWeekStarts } from "./weeks";

// Under ["workouts", ...] on purpose: saving or deleting a workout already
// invalidates workoutKeys.all, so stats refresh with no extra wiring.
export const statsKeys = {
  progress: (since: string) => [...workoutKeys.all, "stats", "progress", since] as const,
  leaderboard: (period: LeaderboardPeriod, metric: LeaderboardMetric) =>
    [...workoutKeys.all, "stats", "leaderboard", period, metric] as const,
};

/** The chart window, computed once per mount (it only changes on Mondays). */
export function useChartWindow() {
  return useMemo(() => {
    const weekStarts = chartWeekStarts(new Date());
    return { weekStarts, since: weekStarts[0]!.toISOString() };
  }, []);
}

export function useProgress(since: string, enabled = true) {
  return useQuery({ queryKey: statsKeys.progress(since), queryFn: () => statsApi.progress(since), enabled });
}

export function useLeaderboard(period: LeaderboardPeriod, metric: LeaderboardMetric) {
  return useQuery({
    queryKey: statsKeys.leaderboard(period, metric),
    queryFn: () => statsApi.leaderboard(period, metric),
    // Switching 7d ↔ 30d keeps the old board on screen until the new one
    // arrives, instead of flashing a skeleton for every toggle
    placeholderData: keepPreviousData,
  });
}
