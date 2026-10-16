import { z } from "zod";
import { uploadKeySchema } from "../uploads/uploads.schemas.js";

const setSchema = z
  .object({
    reps: z.int().min(0).max(1000).optional(),
    weightGrams: z.int().min(0).max(1_000_000).optional(), // up to 1000 kg
    durationSec: z.int().min(0).max(86_400).optional(), // up to 24 h
    distanceM: z.int().min(0).max(1_000_000).optional(), // up to 1000 km
    isWarmup: z.boolean().default(false),
  })
  .refine((s) => s.reps !== undefined || s.durationSec !== undefined || s.distanceM !== undefined, {
    message: "A set needs reps, duration or distance",
  });

const workoutExerciseSchema = z.object({
  exerciseId: z.uuid(),
  notes: z.string().trim().max(500).optional(),
  // No setNumber/position from the client: the server derives them from array
  // order, so the client can never send gaps or duplicates.
  sets: z.array(setSchema).min(1, "Add at least one set").max(50),
});

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
export const MAX_PHOTOS = 4;

/** Used for both create (POST) and full replace (PUT). */
export const workoutInputSchema = z
  .object({
    title: z.string().trim().min(1).max(100),
    notes: z.string().trim().max(2000).optional(),
    visibility: z.enum(["PUBLIC", "FOLLOWERS", "PRIVATE"]).default("PUBLIC"),
    startedAt: z.iso.datetime({ offset: true }).transform((s) => new Date(s)),
    endedAt: z.iso
      .datetime({ offset: true })
      .transform((s) => new Date(s))
      .optional(),
    exercises: z.array(workoutExerciseSchema).min(1, "Add at least one exercise").max(30),
    // Keys from POST /uploads (new photos) or this workout's current photos (kept on edit).
    // Array order = display order. Omitted = no photos (PUT replaces, so it removes them).
    photoKeys: z
      .array(uploadKeySchema)
      .max(MAX_PHOTOS, `Up to ${MAX_PHOTOS} photos`)
      .refine((keys) => new Set(keys).size === keys.length, "The same photo twice")
      .default([]),
  })
  .refine((w) => !w.endedAt || w.endedAt >= w.startedAt, {
    message: "A workout can't end before it starts",
    path: ["endedAt"],
  })
  // Allow a few minutes of skew: phone clocks are often slightly ahead
  .refine((w) => w.startedAt.getTime() <= Date.now() + MAX_CLOCK_SKEW_MS, {
    message: "A workout can't start in the future",
    path: ["startedAt"],
  });

export const listWorkoutsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.uuid().optional(),
});

export const idParamSchema = z.object({ id: z.uuid() });

export type WorkoutInput = z.infer<typeof workoutInputSchema>;
export type ListWorkoutsQuery = z.infer<typeof listWorkoutsQuerySchema>;
