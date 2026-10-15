import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { authorSelect } from "../modules/users/users.select.js";
import { visibleTo } from "../modules/workouts/visibility.js";
import { rooms, type CommentPayload } from "./events.js";
import { getRealtime } from "./state.js";

// Services call these AFTER their write succeeded, the way they already
// invalidate the cache. Each one is fire-and-forget: a failed emit is logged,
// never thrown, because the REST request it follows has already succeeded.
// With no socket server attached (REST tests), every call is a no-op.

function send(what: string, task: () => Promise<void>) {
  if (!getRealtime()) return;
  task().catch((err: unknown) => logger.error({ err }, `realtime: ${what} failed`));
}

/** Likes changed: tell watchers the new count, and notify the owner of a new like. */
export function publishLike(workoutId: string, actorId: string, likeCount: number, added: boolean) {
  send("like", async () => {
    getRealtime()?.to(rooms.workout(workoutId)).emit("workout:likes", { workoutId, likeCount });
    if (added) await notifyOwner("like", workoutId, actorId);
  });
}

export function publishCommentAdded(workoutId: string, comment: CommentPayload) {
  send("comment", async () => {
    getRealtime()?.to(rooms.workout(workoutId)).emit("workout:comment", { workoutId, comment });
    await notifyOwner("comment", workoutId, comment.author.id);
  });
}

export function publishCommentDeleted(workoutId: string, commentId: string) {
  send("comment-deleted", async () => {
    getRealtime()?.to(rooms.workout(workoutId)).emit("workout:comment-deleted", { workoutId, commentId });
  });
}

async function notifyOwner(type: "like" | "comment", workoutId: string, actorId: string) {
  const [workout, actor] = await Promise.all([
    prisma.workout.findUnique({ where: { id: workoutId }, select: { userId: true, title: true } }),
    prisma.user.findUnique({ where: { id: actorId }, select: authorSelect }),
  ]);
  // Never notify you about your own like or comment
  if (!workout || !actor || workout.userId === actorId) return;
  getRealtime()?.to(rooms.user(workout.userId)).emit("notify", { type, workoutId, workoutTitle: workout.title, actor });
}

/**
 * A new workout: tell each follower who may see it. Visibility goes through
 * visibleTo, one check per follower (never a re-implemented rule). Fine at
 * this scale; with thousands of followers this fan-out would move to a job
 * queue instead of running after the request.
 */
export function publishWorkoutCreated(workoutId: string, authorId: string) {
  send("feed:new", async () => {
    const [author, followers] = await Promise.all([
      prisma.user.findUnique({ where: { id: authorId }, select: authorSelect }),
      prisma.follow.findMany({ where: { followingId: authorId }, select: { followerId: true } }),
    ]);
    if (!author || followers.length === 0) return;

    const visible = await Promise.all(
      followers.map(async ({ followerId }) => {
        const count = await prisma.workout.count({ where: { AND: [{ id: workoutId }, visibleTo(followerId)] } });
        return count > 0 ? followerId : null;
      }),
    );
    const recipients = visible.filter((id): id is string => id !== null).map(rooms.user);
    if (recipients.length > 0) getRealtime()?.to(recipients).emit("feed:new", { workoutId, author });
  });
}

/**
 * Visibility changed (or the workout is gone): re-check every watcher with
 * visibleTo, and remove the ones who may no longer see it. Their app is told,
 * so it can leave the screen instead of showing stale data.
 */
export function publishWorkoutChanged(workoutId: string) {
  send("workout-changed", async () => {
    const io = getRealtime();
    if (!io) return;
    const room = rooms.workout(workoutId);
    const watchers = await io.in(room).fetchSockets();
    for (const socket of watchers) {
      const count = await prisma.workout.count({ where: { AND: [{ id: workoutId }, visibleTo(socket.data.userId)] } });
      if (count === 0) {
        socket.emit("workout:hidden", { workoutId });
        socket.leave(room);
      }
    }
  });
}
