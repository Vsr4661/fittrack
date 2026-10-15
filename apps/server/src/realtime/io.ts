import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { socketAuth } from "./auth.js";
import { rooms, type ClientToServerEvents, type ServerToClientEvents, type SocketData } from "./events.js";

export type AppServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

let io: AppServer | null = null;

/**
 * Attaches Socket.IO to the SAME HTTP server as the REST API: one port, one
 * CORS policy, one deploy. Called from server.ts (and by the realtime tests).
 */
export function attachRealtime(httpServer: HttpServer): AppServer {
  io = new Server(httpServer, {
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
  });

  return io;
}

/**
 * The running server, or null when realtime isn't attached (e.g. the REST
 * test suite, which builds the app without an HTTP server). Senders treat
 * null as "nobody is listening" and do nothing.
 */
export function getRealtime(): AppServer | null {
  return io;
}

/**
 * Cuts every socket and detaches. Open WebSockets would otherwise keep
 * http.Server#close from ever finishing during a graceful shutdown.
 */
export function closeRealtime() {
  io?.disconnectSockets(true);
  io = null;
}
