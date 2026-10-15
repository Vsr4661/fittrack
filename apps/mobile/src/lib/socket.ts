import { io, type Socket } from "socket.io-client";
import { env } from "@/config/env";
import { refreshAccessToken } from "@/features/auth/session";
import { useAuthStore } from "@/stores/authStore";
import type { ClientToServerEvents, ServerToClientEvents } from "./socketEvents";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// The one live connection. Like api.ts, this is the only other place that
// reads the access token: features subscribe to events and never see tokens.

let socket: AppSocket | null = null;

/** ws://host:4000 from EXPO_PUBLIC_API_URL ("http://host:4000/api/v1"): the socket lives at the server root. */
const socketUrl = () => new URL(env.EXPO_PUBLIC_API_URL).origin;

/** Refresh the access token (the same single-flight refresh api.ts uses), then reconnect. */
async function reconnectWithFreshToken(s: AppSocket) {
  const token = await refreshAccessToken(); // null = the session is over; it signs the user out itself
  if (token && useAuthStore.getState().status === "signedIn") s.connect();
}

export function getSocket(): AppSocket {
  if (socket) return socket;

  const s: AppSocket = io(socketUrl(), {
    transports: ["websocket"], // the server is WebSocket-only
    autoConnect: false, // connect only while signed in and in the foreground (see useRealtime)
    // A FUNCTION, not a value: read on every (re)connect, so a refreshed token is always used
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
  });

  // Auth failures don't auto-retry in Socket.IO (only network drops do), so
  // an expired token is handled here: refresh, then connect again
  s.on("connect_error", (err: Error & { data?: { code?: string } }) => {
    if (err.data?.code === "TOKEN_EXPIRED") void reconnectWithFreshToken(s);
  });
  // The server cuts a socket when its token expires (and says so first)
  s.on("session:expired", () => void reconnectWithFreshToken(s));

  socket = s;
  return s;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected && useAuthStore.getState().accessToken) s.connect();
}

export function disconnectSocket() {
  socket?.disconnect();
}
