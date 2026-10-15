// The socket contract, typed on both ends of Socket.IO. Writes stay REST;
// sockets only carry HINTS: "this changed, update or refetch". REST stays the
// source of truth, so a phone that missed events while offline just
// refetches on reconnect. Payloads use the same public shapes as REST
// (authorSelect: never an email).

export interface Author {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CommentPayload {
  id: string;
  body: string;
  createdAt: Date;
  author: Author;
}

export interface ServerToClientEvents {
  /** Sent just before the server cuts a socket whose access token expired. */
  "session:expired": () => void;
  /** To watchers of a workout: its like count changed. */
  "workout:likes": (e: { workoutId: string; likeCount: number }) => void;
  /** To watchers: a comment was added... */
  "workout:comment": (e: { workoutId: string; comment: CommentPayload }) => void;
  /** ...or removed. */
  "workout:comment-deleted": (e: { workoutId: string; commentId: string }) => void;
  /** To watchers who can no longer see it (made private, or deleted). */
  "workout:hidden": (e: { workoutId: string }) => void;
  /** To a workout's owner: someone liked or commented. */
  notify: (e: { type: "like" | "comment"; workoutId: string; workoutTitle: string; actor: Author }) => void;
  /** To followers who can see it: someone you follow posted a workout. */
  "feed:new": (e: { workoutId: string; author: Author }) => void;
}

export type WatchAck = { ok: true } | { ok: false; error: "NOT_FOUND" | "BAD_REQUEST" };

export interface ClientToServerEvents {
  /** Start live updates for a workout (allowed only if you can see it). */
  "workout:watch": (workoutId: string, ack: (res: WatchAck) => void) => void;
  "workout:unwatch": (workoutId: string) => void;
}

/** What the server remembers per socket, set once by the auth middleware. */
export interface SocketData {
  userId: string;
}

/** Room names in one place, so a typo can't silently send to an empty room. */
export const rooms = {
  user: (userId: string) => `user:${userId}`,
  workout: (workoutId: string) => `workout:${workoutId}`,
};
