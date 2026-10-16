import { Router } from "express";
import { getAuthUser, requireAuth } from "../../middleware/requireAuth.js";
import { createUploadSchema } from "./uploads.schemas.js";
import * as uploadsService from "./uploads.service.js";

export const uploadsRouter = Router();

/** Step 1 of an upload: get a short-lived link that accepts exactly this file. */
uploadsRouter.post("/", requireAuth, async (req, res) => {
  const input = createUploadSchema.parse(req.body);
  res.status(201).json(await uploadsService.createUpload(getAuthUser(req).id, input));
});
