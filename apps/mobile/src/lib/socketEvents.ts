// Mirrors the server's socket contract (apps/server/src/realtime/events.ts).
// Every event is a hint: update the cache or refetch; REST stays the truth.
import type { Comment } from "@/features/social/types";
import type { Author } from "@/features/workouts/types";

export interface ServerToClientEvents {
  "session:expired": () => void;
  "workout:likes": (e: { workoutId: string; likeCount: number }) => void;
  "workout:comment": (e: { workoutId: string; comment: Comment }) => void;
  "workout:comment-deleted": (e: { workoutId: string; commentId: string }) => void;
  "workout:hidden": (e: { workoutId: string }) => void;
  notify: (e: { type: "like" | "comment"; workoutId: string; workoutTitle: string; actor: Author }) => void;
  "feed:new": (e: { workoutId: string; author: Author }) => void;
}

export type WatchAck = { ok: true } | { ok: false; error: "NOT_FOUND" | "BAD_REQUEST" };

export interface ClientToServerEvents {
  "workout:watch": (workoutId: string, ack: (res: WatchAck) => void) => void;
  "workout:unwatch": (workoutId: string) => void;
}
