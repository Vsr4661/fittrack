import { rateLimit } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { redis } from "../lib/redis.js";
import { AppError } from "../utils/AppError.js";

// Counters live in Redis, not process memory, so the limit holds across
// every API instance behind the load balancer and survives restarts.
function createLimiter(name: string, windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8", // RateLimit-* headers so clients know when to retry
    legacyHeaders: false,
    store: new RedisStore({
      prefix: `rl:${name}:`,
      sendCommand: (command: string, ...args: string[]) =>
        redis.call(command, ...args) as Promise<RedisReply>,
    }),
    // Route through our error handler so 429s use the standard error shape
    handler: (_req, _res, next) => {
      next(new AppError(429, "Too many requests, please try again later", "RATE_LIMITED"));
    },
  });
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/** Login/register: slows down password guessing and signup spam. */
export const credentialsLimiter = createLimiter("credentials", FIFTEEN_MINUTES, 10);

/** Refresh is called routinely by the app, so it gets a looser limit. */
export const refreshLimiter = createLimiter("refresh", FIFTEEN_MINUTES, 60);
