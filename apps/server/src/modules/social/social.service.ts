import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { authorSelect } from "../users/users.select.js";
import { assertWorkoutVisible } from "../workouts/workouts.service.js";

// ─── Likes ─────────────────────────────────────────────
// PUT/DELETE (not a POST "toggle"): both are idempotent. If the app retries
// a request after a timeout, a toggle would flip the like back off; PUT
// "make it liked" gives the same result no matter how many times it runs.

export async function like(userId: string, workoutId: string) {
  await assertWorkoutVisible(userId, workoutId);
  // skipDuplicates -> ON CONFLICT DO NOTHING: liking twice is a no-op, not an error
  await prisma.like.createMany({ data: [{ userId, workoutId }], skipDuplicates: true });
  return likeState(userId, workoutId);
}

export async function unlike(userId: string, workoutId: string) {
  await assertWorkoutVisible(userId, workoutId);
  await prisma.like.deleteMany({ where: { userId, workoutId } });
  return likeState(userId, workoutId);
}

/** The server's truth, so the app can reconcile its optimistic update. */
async function likeState(userId: string, workoutId: string) {
  const [likeCount, mine] = await Promise.all([
    prisma.like.count({ where: { workoutId } }),
    prisma.like.count({ where: { workoutId, userId } }),
  ]);
  return { likeCount, likedByMe: mine > 0 };
}

// ─── Comments ──────────────────────────────────────────

// The relation is called `user` in the schema; the API calls it `author`
const commentSelect = { id: true, body: true, createdAt: true, user: { select: authorSelect } } as const;

export async function listComments(viewerId: string, workoutId: string, { limit, cursor }: { limit: number; cursor?: string }) {
  await assertWorkoutVisible(viewerId, workoutId);
  const rows = await prisma.comment.findMany({
    where: { workoutId },
    orderBy: { id: "asc" }, // UUIDv7 = creation order: oldest first, like a conversation
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    select: commentSelect,
  });
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: page.map(({ user, ...c }) => ({ ...c, author: user })),
    nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
  };
}

export async function addComment(userId: string, workoutId: string, body: string) {
  await assertWorkoutVisible(userId, workoutId);
  const { user, ...comment } = await prisma.comment.create({
    data: { userId, workoutId, body },
    select: commentSelect,
  });
  return { ...comment, author: user };
}

/** The comment's author can delete it, and so can the workout's owner (moderating their own post). */
export async function deleteComment(userId: string, commentId: string) {
  const { count } = await prisma.comment.deleteMany({
    where: { id: commentId, OR: [{ userId }, { workout: { userId } }] },
  });
  if (count === 0) throw AppError.notFound("Comment not found");
}
