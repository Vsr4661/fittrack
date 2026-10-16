import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";
import { attachRealtime, closeRealtime } from "./realtime/io.js";
import { sweepStaleUploads } from "./modules/uploads/uploads.service.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`FitTrack API listening on http://localhost:${env.PORT}`);
});
attachRealtime(server); // Socket.IO shares the port: ws://localhost:PORT/socket.io/

// Hourly cleanup of uploads that were never attached (abandoned drafts).
// In-process is enough here: the sweep is idempotent, so several instances
// running it is harmless. A bigger deployment would use a scheduled job.
const sweepTimer = setInterval(() => {
  sweepStaleUploads()
    .then((n) => n > 0 && logger.info(`Swept ${n} stale uploads`))
    .catch((err) => logger.error({ err }, "Stale upload sweep failed"));
}, 60 * 60 * 1000);
sweepTimer.unref(); // never keeps the process alive on its own

function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  // Sockets first: an open WebSocket would keep server.close() waiting forever
  closeRealtime();
  // Stop accepting requests, then close connections once in-flight ones finish
  server.close(async (err) => {
    await Promise.allSettled([prisma.$disconnect(), redis.quit()]);
    if (err) {
      logger.error({ err }, "Error during shutdown");
      process.exit(1);
    }
    process.exit(0);
  });
  // Force-exit if open connections don't drain in time
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection");
  process.exit(1);
});
