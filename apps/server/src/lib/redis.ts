import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

// ioredis connects on creation and queues commands until the connection is up,
// so modules that use Redis at import time (e.g. the rate-limit store) are safe.
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3, // fail a command after 3 retries instead of hanging forever
});

redis.on("error", (err) => logger.error({ err }, "Redis connection error"));
