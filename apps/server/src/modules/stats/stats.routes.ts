import { Router } from "express";
import { getAuthUser, requireAuth } from "../../middleware/requireAuth.js";
import { leaderboardQuerySchema, progressQuerySchema } from "./stats.schemas.js";
import { getLeaderboard, getProgress } from "./stats.service.js";

// Mounted at /api/v1 (paths /progress and /leaderboard), so auth is attached
// per route, like the social router.
export const statsRouter = Router();

statsRouter.get("/progress", requireAuth, async (req, res) => {
  res.json(await getProgress(getAuthUser(req).id, progressQuerySchema.parse(req.query)));
});

statsRouter.get("/leaderboard", requireAuth, async (req, res) => {
  res.json(await getLeaderboard(getAuthUser(req).id, leaderboardQuerySchema.parse(req.query)));
});
