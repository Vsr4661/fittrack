import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { getAuthUser, requireAuth } from "../../middleware/requireAuth.js";
import { AppError } from "../../utils/AppError.js";
import { publicUserSelect } from "./users.select.js";

export const usersRouter = Router();

usersRouter.get("/me", requireAuth, async (req, res) => {
  const { id } = getAuthUser(req);
  const user = await prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  // A valid token for a deleted account: the token outlived the user
  if (!user) throw AppError.notFound("User not found");
  res.json({ user });
});
