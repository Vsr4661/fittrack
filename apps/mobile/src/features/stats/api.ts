import { api } from "@/lib/api";
import type { Leaderboard, LeaderboardMetric, LeaderboardPeriod, Progress } from "./types";

export const statsApi = {
  progress: async (since: string) => (await api.get<Progress>("/progress", { params: { since } })).data,
  leaderboard: async (period: LeaderboardPeriod, metric: LeaderboardMetric) =>
    (await api.get<Leaderboard>("/leaderboard", { params: { period, metric } })).data,
};
