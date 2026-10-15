import { Router } from "express";
import { z } from "zod";
import { getAuthUser, requireAuth } from "../../middleware/requireAuth.js";
import { idParamSchema, listWorkoutsQuerySchema } from "../workouts/workouts.schemas.js";
import { listFeed } from "../workouts/workouts.service.js";
import * as social from "./social.service.js";

// Mounted at /api/v1 (its paths span /feed, /workouts, /comments), so auth is
// attached per route. A router-level `use(requireAuth)` here would run for
// EVERY /api/v1 request reaching this router, turning unknown-route 404s into 401s.
export const socialRouter = Router();

const commentBodySchema = z.object({ body: z.string().trim().min(1, "Comment can't be empty").max(500) });
const pageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.uuid().optional(),
});

socialRouter.get("/feed", requireAuth, async (req, res) => {
  const page = listWorkoutsQuerySchema.parse(req.query);
  res.json(await listFeed(getAuthUser(req).id, page));
});

socialRouter.put("/workouts/:id/like", requireAuth, async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await social.like(getAuthUser(req).id, id));
});

socialRouter.delete("/workouts/:id/like", requireAuth, async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await social.unlike(getAuthUser(req).id, id));
});

socialRouter.get("/workouts/:id/comments", requireAuth, async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await social.listComments(getAuthUser(req).id, id, pageQuerySchema.parse(req.query)));
});

socialRouter.post("/workouts/:id/comments", requireAuth, async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { body } = commentBodySchema.parse(req.body);
  res.status(201).json({ comment: await social.addComment(getAuthUser(req).id, id, body) });
});

socialRouter.delete("/comments/:id", requireAuth, async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  await social.deleteComment(getAuthUser(req).id, id);
  res.status(204).end();
});
