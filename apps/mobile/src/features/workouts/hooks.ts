import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workoutsApi } from "./api";

// Query-key factory: one source of truth, so invalidating "all workouts"
// can't miss a key that someone typed slightly differently.
// Everything that contains workouts lives under ["workouts", ...], so a like
// can update every copy at once with one setQueriesData({ queryKey: all }).
export const workoutKeys = {
  all: ["workouts"] as const,
  list: () => [...workoutKeys.all, "list"] as const,
  feed: () => [...workoutKeys.all, "feed"] as const,
  user: (username: string) => [...workoutKeys.all, "user", username] as const,
  detail: (id: string) => [...workoutKeys.all, "detail", id] as const,
  exercises: ["exercises"] as const,
};

export function useWorkoutHistory() {
  return useInfiniteQuery({
    queryKey: workoutKeys.list(),
    queryFn: ({ pageParam }) => workoutsApi.list(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useWorkout(id: string) {
  return useQuery({ queryKey: workoutKeys.detail(id), queryFn: () => workoutsApi.get(id) });
}

export function useExercises() {
  // The catalog barely changes: fetch once, filter on-device for instant search
  return useQuery({ queryKey: workoutKeys.exercises, queryFn: workoutsApi.exercises, staleTime: 60 * 60 * 1000 });
}

export function useCreateWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workoutsApi.create,
    onSuccess: (workout) => {
      queryClient.setQueryData(workoutKeys.detail(workout.id), workout); // detail screen opens instantly
      // History, feed and my profile list all gain an item; my workout count changes
      queryClient.invalidateQueries({ queryKey: workoutKeys.all });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: workoutsApi.remove,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: workoutKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: workoutKeys.all });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
