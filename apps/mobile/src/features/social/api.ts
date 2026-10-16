import type { User } from "@/features/auth/types";
import type { WorkoutPage } from "@/features/workouts/types";
import { api } from "@/lib/api";
import type { Comment, LikeState, Page, Profile, UserSearchResult } from "./types";

export const socialApi = {
  feed: async (cursor?: string) => (await api.get<WorkoutPage>("/feed", { params: { limit: 20, cursor } })).data,

  like: async (workoutId: string) => (await api.put<LikeState>(`/workouts/${workoutId}/like`)).data,
  unlike: async (workoutId: string) => (await api.delete<LikeState>(`/workouts/${workoutId}/like`)).data,

  comments: async (workoutId: string, cursor?: string) =>
    (await api.get<Page<Comment>>(`/workouts/${workoutId}/comments`, { params: { limit: 50, cursor } })).data,
  addComment: async (workoutId: string, body: string) =>
    (await api.post<{ comment: Comment }>(`/workouts/${workoutId}/comments`, { body })).data.comment,
  deleteComment: async (commentId: string) => {
    await api.delete(`/comments/${commentId}`);
  },

  profile: async (username: string) => (await api.get<{ profile: Profile }>(`/users/${username}`)).data.profile,
  userWorkouts: async (username: string, cursor?: string) =>
    (await api.get<WorkoutPage>(`/users/${username}/workouts`, { params: { limit: 20, cursor } })).data,
  follow: async (username: string) => {
    await api.put(`/users/${username}/follow`);
  },
  unfollow: async (username: string) => {
    await api.delete(`/users/${username}/follow`);
  },
  search: async (q: string) => (await api.get<{ users: UserSearchResult[] }>("/users/search", { params: { q } })).data.users,
  updateMe: async (data: { displayName?: string; bio?: string }) =>
    (await api.patch<{ user: User }>("/users/me", data)).data.user,
  /** `key` comes from an AVATAR upload (features/uploads). */
  setAvatar: async (key: string) => (await api.put<{ user: User }>("/users/me/avatar", { key })).data.user,
  removeAvatar: async () => (await api.delete<{ user: User }>("/users/me/avatar")).data.user,
};
