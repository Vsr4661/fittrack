import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from "./events.js";

export type AppServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

// Who holds the running Socket.IO server. A leaf module (no app imports), so
// services can publish through it without an import cycle:
// workouts.service -> publish -> state, while io.ts (which imports the
// services for its visibility check) is the only one that sets it.
let current: AppServer | null = null;

export function setRealtime(io: AppServer | null) {
  current = io;
}

/**
 * The running server, or null when realtime isn't attached (e.g. the REST
 * test suite, which builds the app without an HTTP server). Publishers treat
 * null as "nobody is listening" and do nothing.
 */
export function getRealtime(): AppServer | null {
  return current;
}
