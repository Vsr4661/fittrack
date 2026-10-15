import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { assertWorkoutVisible } from "../modules/workouts/workouts.service.js";
import { socketAuth } from "./auth.js";
import { rooms } from "./events.js";
import { getRealtime, setRealtime, type AppServer } from "./state.js";

export type { AppServer };

/**
 * Attaches Socket.IO to the SAME HTTP server as the REST API: one port, one
 * CORS policy, one deploy. Called from server.ts (and by the realtime tests).
 */
export function attachRealtime(httpServer: HttpServer): AppServer {
  const io: AppServer = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGINS.includes("*") ? true : env.CORS_ORIGINS },
    // WebSocket only: React Native supports it natively, and skipping the
    // HTTP long-polling fallback avoids sticky-session needs when scaling out
    transports: ["websocket"],
  });

  io.use(socketAuth);

  io.on("connection", (socket) => {
    // Every socket joins its user's room, so "notify user X" reaches all of
    // X's devices without tracking socket ids
    void socket.join(rooms.user(socket.data.userId));
    logger.debug({ userId: socket.data.userId }, "socket connected");

    // Live updates for one workout. The SAME visibility check as GET
    // /workouts/:id (assertWorkoutVisible -> visibleTo), so a socket can never
    // watch a workout the REST API would 404 for this user.
    socket.on("workout:watch", async (workoutId, ack) => {
      const reply = typeof ack === "function" ? ack : () => {}; // clients may omit the ack
      const id = z.uuid().safeParse(workoutId);
      if (!id.success) return reply({ ok: false, error: "BAD_REQUEST" });
      try {
        await assertWorkoutVisible(socket.data.userId, id.data);
      } catch {
        return reply({ ok: false, error: "NOT_FOUND" }); // same answer as REST: "not found", never "forbidden"
      }
      await socket.join(rooms.workout(id.data));
      reply({ ok: true });
    });

    socket.on("workout:unwatch", (workoutId) => {
      if (typeof workoutId === "string") void socket.leave(rooms.workout(workoutId));
    });
  });

  setRealtime(io);
  return io;
}

/**
 * Cuts every socket and detaches. Open WebSockets would otherwise keep
 * http.Server#close from ever finishing during a graceful shutdown.
 */
export function closeRealtime() {
  getRealtime()?.disconnectSockets(true);
  setRealtime(null);
}
