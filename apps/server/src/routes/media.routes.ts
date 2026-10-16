import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { DOWNLOAD_URL_TTL_S, presignDownload } from "../lib/storage.js";
import { AppError } from "../utils/AppError.js";

export const mediaRouter = Router();

const avatarParamsSchema = z.object({
  userId: z.uuid(),
  file: z.string().regex(/^[0-9a-f-]{36}\.(jpg|png|webp|heic)$/),
});

/**
 * Avatars have a STABLE link (unlike workout photos), so the phone's image
 * cache works and the URL can live in every author object. This redirects to
 * a fresh signed storage link. No login needed: like on any social app,
 * profile pictures are public, and the key's UUID makes links unguessable.
 */
mediaRouter.get("/avatars/:userId/:file", async (req, res) => {
  const { userId, file } = avatarParamsSchema.parse(req.params);
  const key = `avatars/${userId}/${file}`;

  // Only a CURRENT avatar is served. Checking the users table (not just the
  // key's shape) means this public route can't be used to read pending
  // uploads, old avatars, or workout photos, which stay behind visibleTo.
  const owner = await prisma.user.findFirst({ where: { id: userId, avatarKey: key }, select: { id: true } });
  if (!owner) throw AppError.notFound("Avatar not found");

  // Cache the redirect a bit less than the signed link lives
  res.set("Cache-Control", `private, max-age=${DOWNLOAD_URL_TTL_S - 300}`);
  res.redirect(302, await presignDownload(key));
});
