import { logger } from "./logger.js";
import { redis } from "./redis.js";

/**
 * Cache-aside: return the cached value if present, otherwise compute it,
 * store it with a TTL, and return it.
 *
 * Redis failures never break the request: we log and fall through to the
 * database. A cache is an optimisation, so it must not become a dependency.
 */
export async function cached<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch (err) {
    logger.warn({ err, key }, "Cache read failed; using the database");
  }

  const value = await compute();

  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, "Cache write failed");
  }
  return value;
}

/** Drop keys after a write so readers don't see stale data until the TTL runs out. */
export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    // Worst case: stale counts until the (short) TTL expires
    logger.warn({ err, keys }, "Cache invalidation failed");
  }
}

export const cacheKeys = {
  profileCounts: (userId: string) => `profile:counts:${userId}`,
};
