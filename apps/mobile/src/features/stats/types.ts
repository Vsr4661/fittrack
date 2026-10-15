// Mirrors the server's stats responses (modules/stats/stats.service.ts).
import type { Author, MuscleGroup } from "@/features/workouts/types";

export interface ProgressSession {
  id: string;
  startedAt: string;
  setCount: number;
  volumeGrams: number;
}

export interface PersonalRecord {
  exercise: { id: string; name: string; muscleGroup: MuscleGroup };
  weightGrams: number;
  reps: number;
  workoutId: string;
  achievedAt: string;
  /** How many of my workouts include this exercise (1 = first time ever). */
  sessionCount: number;
}

export interface Progress {
  sessions: ProgressSession[];
  personalRecords: PersonalRecord[];
}

export type LeaderboardPeriod = "7d" | "30d";
export type LeaderboardMetric = "volume" | "workouts";

export interface LeaderboardEntry {
  rank: number;
  user: Author;
  workouts: number;
  volumeGrams: number;
  isMe: boolean;
}

export interface Leaderboard {
  period: LeaderboardPeriod;
  metric: LeaderboardMetric;
  since: string;
  entries: LeaderboardEntry[];
}
