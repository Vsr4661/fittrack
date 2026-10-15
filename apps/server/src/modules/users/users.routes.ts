import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { getAuthUser, requireAuth } from "../../middleware/requireAuth.js";
import { AppError } from "../../utils/AppError.js";
import { listWorkoutsQuerySchema } from "../workouts/workouts.schemas.js";
import { listUserWorkouts } from "../workouts/workouts.service.js";
import { publicUserSelect } from "./users.select.js";
import * as usersService from "./users.service.js";

export const usersRouter = Router();
usersRouter.use(requireAuth);

const usernameParamSchema = z.object({ username: z.string().trim().toLowerCase().min(3).max(30) });
const searchQuerySchema = z.object({ q: z.string().trim().min(1).max(50) });
const updateMeSchema = z
  .object({
    displayName: z.string().trim().min(1).max(50).optional(),
    // Empty string clears the bio
    bio: z
      .string()
      .trim()
      .max(160)
      .transform((b) => (b === "" ? null : b))
      .optional(),
  })
  .refine((d) => d.displayName !== undefined || d.bio !== undefined, { message: "Nothing to update" });

// Static routes first: Express matches in order, so "/me" and "/search" must
// come before "/:username" (those words are also reserved at registration).

usersRouter.get("/me", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: getAuthUser(req).id }, select: publicUserSelect });
  // A valid token for a deleted account: the token outlived the user
  if (!user) throw AppError.notFound("User not found");
  res.json({ user });
});

usersRouter.patch("/me", async (req, res) => {
  const data = updateMeSchema.parse(req.body);
  res.json({ user: await usersService.updateMe(getAuthUser(req).id, data) });
});

usersRouter.get("/search", async (req, res) => {
  const { q } = searchQuerySchema.parse(req.query);
  res.json({ users: await usersService.searchUsers(getAuthUser(req).id, q) });
});

usersRouter.get("/:username", async (req, res) => {
  const { username } = usernameParamSchema.parse(req.params);
  res.json({ profile: await usersService.getProfile(getAuthUser(req).id, username) });
});

usersRouter.get("/:username/workouts", async (req, res) => {
  const { username } = usernameParamSchema.parse(req.params);
  const page = listWorkoutsQuerySchema.parse(req.query);
  const owner = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!owner) throw AppError.notFound("User not found");
  res.json(await listUserWorkouts(getAuthUser(req).id, owner.id, page));
});

usersRouter.put("/:username/follow", async (req, res) => {
  const { username } = usernameParamSchema.parse(req.params);
  await usersService.follow(getAuthUser(req).id, username);
  res.status(204).end();
});

usersRouter.delete("/:username/follow", async (req, res) => {
  const { username } = usernameParamSchema.parse(req.params);
  await usersService.unfollow(getAuthUser(req).id, username);
  res.status(204).end();
});
