import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { getAuthUser, requireAuth } from "../../middleware/requireAuth.js";

export const exercisesRouter = Router();

const listQuerySchema = z.object({
  search: z.string().trim().max(50).optional(),
  muscleGroup: z
    .enum(["CHEST", "BACK", "LEGS", "SHOULDERS", "ARMS", "CORE", "FULL_BODY", "CARDIO"])
    .optional(),
});

// The catalog is small (tens of rows), so it's returned whole: no pagination needed.
exercisesRouter.get("/", requireAuth, async (req, res) => {
  const { search, muscleGroup } = listQuerySchema.parse(req.query);
  const exercises = await prisma.exercise.findMany({
    where: {
      // Built-in exercises plus this user's own custom ones, never other users'
      OR: [{ createdById: null }, { createdById: getAuthUser(req).id }],
      ...(muscleGroup && { muscleGroup }),
      ...(search && { name: { contains: search, mode: "insensitive" } }),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, muscleGroup: true, equipment: true, createdById: true },
  });
  res.json({ exercises });
});
