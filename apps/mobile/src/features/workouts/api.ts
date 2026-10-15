import { api } from "@/lib/api";
import type { Exercise, WorkoutDetail, WorkoutInput, WorkoutPage } from "./types";

export const workoutsApi = {
  list: async (cursor?: string) =>
    (await api.get<WorkoutPage>("/workouts", { params: { limit: 20, cursor } })).data,
  get: async (id: string) => (await api.get<{ workout: WorkoutDetail }>(`/workouts/${id}`)).data.workout,
  create: async (input: WorkoutInput) =>
    (await api.post<{ workout: WorkoutDetail }>("/workouts", input)).data.workout,
  remove: async (id: string) => {
    await api.delete(`/workouts/${id}`);
  },
  exercises: async () => (await api.get<{ exercises: Exercise[] }>("/exercises")).data.exercises,
};
