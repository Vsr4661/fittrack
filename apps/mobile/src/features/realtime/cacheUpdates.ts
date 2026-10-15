// How socket events change the TanStack Query cache. Pure where possible, so
// they're unit-tested without a socket.
import type { QueryClient } from "@tanstack/react-query";
import { updateWorkoutEverywhere } from "@/features/social/cache";
import { socialKeys } from "@/features/social/hooks";
import type { WorkoutSocial } from "@/features/workouts/types";
import { workoutKeys } from "@/features/workouts/hooks";

/**
 * Sets (not adds to) the like count. The event carries the server's absolute
 * count, so a duplicate event, or the echo of my own like, can't double-count.
 * likedByMe is left alone: the event doesn't say who liked.
 */
export function withLikeCount<T extends { social: WorkoutSocial }>(workout: T, likeCount: number): T {
  if (workout.social.likeCount === likeCount) return workout; // same object: no re-render
  return { ...workout, social: { ...workout.social, likeCount } };
}

export function applyLikeCount(queryClient: QueryClient, workoutId: string, likeCount: number) {
  updateWorkoutEverywhere(queryClient, workoutId, (w) => withLikeCount(w, likeCount));
}

/**
 * A comment came or went: refetch that workout's comments and detail from
 * REST rather than adding/subtracting. My own comment also comes back as an
 * event, and a "+1" here would count it twice.
 */
export function refreshComments(queryClient: QueryClient, workoutId: string) {
  void queryClient.invalidateQueries({ queryKey: socialKeys.comments(workoutId) });
  void queryClient.invalidateQueries({ queryKey: workoutKeys.detail(workoutId) });
}

/** After a reconnect, anything may have changed while we weren't listening. */
export function refreshAfterReconnect(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: workoutKeys.all });
  void queryClient.invalidateQueries({ queryKey: ["comments"] });
}
