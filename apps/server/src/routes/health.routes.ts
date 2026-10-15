import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const healthRouter = Router();

// Liveness: is the process up? Never touches dependencies, so a slow DB
// doesn't make the orchestrator kill and restart a healthy process.
healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Readiness: can this instance serve traffic right now?
// Load balancers stop routing to it (503) until the DB is reachable.
healthRouter.get("/health/ready", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", checks: { database: "ok" } });
  } catch (err) {
    req.log.warn({ err }, "Readiness check failed");
    res.status(503).json({ status: "unavailable", checks: { database: "error" } });
  }
});
