import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { meQueryKey } from "@/features/auth/session";
import { workoutKeys } from "@/features/workouts/hooks";
import { socialApi } from "./api";
import { adjustCommentCount, applyLike, updateWorkoutEverywhere } from "./cache";
import type { Profile } from "./types";

export const socialKeys = {
  profile: (username: string) => ["profile", username] as const,
  comments: (workoutId: string) => ["comments", workoutId] as const,
  search: (q: string) => ["userSearch", q] as const,
};

// ─── Lists ─────────────────────────────────────────────

export function useFeed() {
  return useInfiniteQuery({
    queryKey: workoutKeys.feed(),
    queryFn: ({ pageParam }) => socialApi.feed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useUserWorkouts(username: string) {
  return useInfiniteQuery({
    queryKey: workoutKeys.user(username),
    queryFn: ({ pageParam }) => socialApi.userWorkouts(username, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useComments(workoutId: string) {
  return useInfiniteQuery({
    queryKey: socialKeys.comments(workoutId),
    queryFn: ({ pageParam }) => socialApi.comments(workoutId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

// ─── Profiles & search ─────────────────────────────────

export function useProfile(username: string | undefined) {
  return useQuery({
    queryKey: socialKeys.profile(username ?? ""),
    queryFn: () => socialApi.profile(username as string),
    enabled: Boolean(username), // my own username comes from /me, which may still be loading
  });
}

export function useUserSearch(q: string) {
  return useQuery({
    queryKey: socialKeys.search(q),
    queryFn: () => socialApi.search(q),
    enabled: q.length > 0,
    placeholderData: keepPreviousData, // keep old results on screen while the next search loads
  });
}

// ─── Likes (optimistic) ────────────────────────────────

/**
 * Optimistic update: the heart changes the instant you tap, then we tell the
 * server. On failure we roll every cache back to the snapshot.
 */
export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["like"],
    mutationFn: ({ workoutId, liked }: { workoutId: string; liked: boolean }) =>
      liked ? socialApi.like(workoutId) : socialApi.unlike(workoutId),

    onMutate: async ({ workoutId, liked }) => {
      // Stop in-flight refetches from overwriting the optimistic value with stale data
      await queryClient.cancelQueries({ queryKey: workoutKeys.all });
      const snapshot = queryClient.getQueriesData({ queryKey: workoutKeys.all });
      updateWorkoutEverywhere(queryClient, workoutId, (w) => applyLike(w, liked));
      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      for (const [key, data] of context?.snapshot ?? []) queryClient.setQueryData(key, data);
    },

    onSuccess: (serverState, { workoutId }) => {
      // Rapid double-tap = two requests in flight. Only the LAST one's answer is
      // the user's intent; applying an earlier response would flicker the heart.
      const pending = queryClient.isMutating({
        mutationKey: ["like"],
        predicate: (m) => (m.state.variables as { workoutId?: string } | undefined)?.workoutId === workoutId,
      });
      if (pending > 1) return;
      updateWorkoutEverywhere(queryClient, workoutId, (w) => ({ ...w, social: { ...w.social, ...serverState } }));
    },
  });
}

// ─── Follow (optimistic) ───────────────────────────────

export function useToggleFollow(username: string) {
  const queryClient = useQueryClient();
  const key = socialKeys.profile(username);

  return useMutation({
    mutationFn: (follow: boolean) => (follow ? socialApi.follow(username) : socialApi.unfollow(username)),

    onMutate: async (follow) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Profile>(key);
      if (previous && previous.isFollowing !== follow) {
        queryClient.setQueryData<Profile>(key, {
          ...previous,
          isFollowing: follow,
          counts: { ...previous.counts, followers: previous.counts.followers + (follow ? 1 : -1) },
        });
      }
      return { previous };
    },

    onError: (_err, _follow, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      // Following changes what's in my feed and which of their workouts I can see
      queryClient.invalidateQueries({ queryKey: workoutKeys.feed() });
      queryClient.invalidateQueries({ queryKey: workoutKeys.user(username) });
      queryClient.invalidateQueries({ queryKey: ["userSearch"] });
    },
  });
}

// ─── Comments ──────────────────────────────────────────

export function useAddComment(workoutId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => socialApi.addComment(workoutId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.comments(workoutId) });
      updateWorkoutEverywhere(queryClient, workoutId, (w) => adjustCommentCount(w, 1));
    },
  });
}

export function useDeleteComment(workoutId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: socialApi.deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.comments(workoutId) });
      updateWorkoutEverywhere(queryClient, workoutId, (w) => adjustCommentCount(w, -1));
    },
  });
}

// ─── Edit profile ──────────────────────────────────────

export function useUpdateMe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: socialApi.updateMe,
    onSuccess: (user) => {
      queryClient.setQueryData(meQueryKey, user);
      queryClient.invalidateQueries({ queryKey: socialKeys.profile(user.username) });
    },
  });
}
