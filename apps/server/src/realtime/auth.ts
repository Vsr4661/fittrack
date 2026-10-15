import { decodeJwt, errors as joseErrors } from "jose";
import type { Socket } from "socket.io";
import { verifyAccessToken } from "../modules/auth/tokens.js";
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from "./events.js";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/** Error codes the client can act on, mirroring the REST API's 401 codes. */
export type SocketAuthCode = "UNAUTHORIZED" | "TOKEN_EXPIRED";

function authError(code: SocketAuthCode, message: string) {
  // `data` reaches the client's "connect_error" handler as err.data
  return Object.assign(new Error(message), { data: { code } });
}

/**
 * Runs once per connection, before the socket is accepted: the same rule as
 * requireAuth for REST, using the same verifyAccessToken (not a second copy).
 * The token travels in the handshake's `auth` payload, not the URL, so it
 * never lands in proxy or server access logs.
 */
export async function socketAuth(socket: AppSocket, next: (err?: Error) => void) {
  const token: unknown = socket.handshake.auth.token;
  if (typeof token !== "string" || token === "") return next(authError("UNAUTHORIZED", "Missing access token"));

  try {
    const { userId } = await verifyAccessToken(token);
    socket.data.userId = userId;
    scheduleExpiryDisconnect(socket, token);
    next();
  } catch (err) {
    // A distinct code tells the app "refresh and reconnect" vs "you're signed out"
    if (err instanceof joseErrors.JWTExpired) return next(authError("TOKEN_EXPIRED", "Access token expired"));
    next(authError("UNAUTHORIZED", "Invalid access token"));
  }
}

/**
 * A socket outlives the token that opened it, so the server ends it when that
 * token expires. A revoked or stolen session then keeps receiving events no
 * longer than it could keep calling the REST API (one access-token lifetime).
 * "session:expired" first, because Socket.IO clients don't auto-reconnect
 * after a server-side disconnect: the app refreshes its token and reconnects.
 */
function scheduleExpiryDisconnect(socket: AppSocket, token: string) {
  const { exp } = decodeJwt(token); // already verified above, so decoding is safe
  if (!exp) return;
  const timer = setTimeout(() => {
    socket.emit("session:expired");
    socket.disconnect(true);
  }, Math.max(0, exp * 1000 - Date.now()));
  timer.unref(); // never keeps the process alive on shutdown
  socket.on("disconnect", () => clearTimeout(timer));
}
