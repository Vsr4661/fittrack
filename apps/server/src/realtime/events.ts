// The socket contract, typed on both ends of Socket.IO. Events only flow
// server -> client (writes stay REST), and every event is a HINT: "this
// changed, update or refetch". REST stays the source of truth, so a phone
// that missed events while offline just refetches on reconnect.

export interface ServerToClientEvents {
  /** Sent just before the server cuts a socket whose access token expired. */
  "session:expired": () => void;
}

/** Filled in as features land (watching a workout comes next). */
export type ClientToServerEvents = Record<string, never>;

/** What the server remembers per socket, set once by the auth middleware. */
export interface SocketData {
  userId: string;
}

/** Room names in one place, so a typo can't silently send to an empty room. */
export const rooms = {
  user: (userId: string) => `user:${userId}`,
};
