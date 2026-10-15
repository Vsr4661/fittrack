import { Router } from "express";
import { credentialsLimiter, refreshLimiter } from "../../middleware/rateLimit.js";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schemas.js";
import * as authService from "./auth.service.js";

export const authRouter = Router();

// Each handler: parse input with Zod (throws ZodError -> 400 via errorHandler),
// call the service, send the response. No business logic lives here.

authRouter.post("/register", credentialsLimiter, async (req, res) => {
  const input = registerSchema.parse(req.body);
  res.status(201).json(await authService.register(input));
});

authRouter.post("/login", credentialsLimiter, async (req, res) => {
  const input = loginSchema.parse(req.body);
  res.json(await authService.login(input));
});

authRouter.post("/refresh", refreshLimiter, async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  res.json(await authService.refresh(refreshToken));
});

authRouter.post("/logout", async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  await authService.logout(refreshToken);
  res.status(204).end();
});
