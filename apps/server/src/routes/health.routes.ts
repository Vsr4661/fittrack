import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";

export const healthRouter = Router();

// Liveness: is the process up? Never touches dependencies, so a slow DB
// doesn't make the orchestrator kill and restart a healthy process.
healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Readiness: can this instance serve traffic right now?
// Load balancers stop routing to it (503) until every dependency is reachable.
healthRouter.get("/health/ready", async (req, res) => {
  // Run checks in parallel; allSettled so one failure doesn't hide the other's result
  const [database, cache] = await Promise.allSettled([prisma.$queryRaw`SELECT 1`, redis.ping()]);
  const checks = {
    database: database.status === "fulfilled" ? "ok" : "error",
    redis: cache.status === "fulfilled" ? "ok" : "error",
  };
  const ready = Object.values(checks).every((c) => c === "ok");

  if (!ready) req.log.warn({ checks }, "Readiness check failed");
  res.status(ready ? 200 : 503).json({ status: ready ? "ready" : "unavailable", checks });
});
