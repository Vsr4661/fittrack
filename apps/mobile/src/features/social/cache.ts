import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { workoutKeys } from "@/features/workouts/hooks";
import type { WorkoutPage, WorkoutSocial } from "@/features/workouts/types";

type WithSocial = { id: string; social: WorkoutSocial };

/**
 * The same workout can be cached in many places at once: the feed, my
 * history, someone's profile list, and its detail screen. A like must update
 * all of them, or the heart is red on one screen and empty on another.
 *
 * Pure function over one cache entry: handles both shapes we store under
 * workoutKeys.all, infinite lists ({ pages: [{ items }] }) and a single detail.
 */
export function mapWorkoutInData(data: unknown, workoutId: string, fn: <T extends WithSocial>(w: T) => T): unknown {
  if (!data || typeof data !== "object") return data;

  if ("pages" in data) {
    const infinite = data as InfiniteData<WorkoutPage>;
    let changed = false;
    const pages = infinite.pages.map((page) => {
      if (!page.items.some((w) => w.id === workoutId)) return page;
      changed = true;
      return { ...page, items: page.items.map((w) => (w.id === workoutId ? fn(w) : w)) };
    });
    // Return the same object when nothing matched, so React Query doesn't re-render needlessly
    return changed ? { ...infinite, pages } : data;
  }

  const single = data as Partial<WithSocial>;
  return single.id === workoutId && single.social ? fn(single as WithSocial) : data;
}

export function updateWorkoutEverywhere(queryClient: QueryClient, workoutId: string, fn: <T extends WithSocial>(w: T) => T) {
  queryClient.setQueriesData({ queryKey: workoutKeys.all }, (data: unknown) => mapWorkoutInData(data, workoutId, fn));
}

/** Optimistic like/unlike. Idempotent: liking an already-liked workout changes nothing. */
export function applyLike<T extends WithSocial>(workout: T, liked: boolean): T {
  if (workout.social.likedByMe === liked) return workout;
  return {
    ...workout,
    social: {
      ...workout.social,
      likedByMe: liked,
      likeCount: Math.max(0, workout.social.likeCount + (liked ? 1 : -1)),
    },
  };
}

export function adjustCommentCount<T extends WithSocial>(workout: T, delta: number): T {
  return { ...workout, social: { ...workout.social, commentCount: Math.max(0, workout.social.commentCount + delta) } };
}
