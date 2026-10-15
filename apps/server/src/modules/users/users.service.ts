import { cached, cacheKeys, invalidate } from "../../lib/cache.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { profileSelect, publicUserSelect } from "./users.select.js";

const PROFILE_COUNTS_TTL_SECONDS = 60;

/**
 * Counts are read on every profile view but change rarely, so they're cached.
 * The short TTL bounds staleness even if an invalidation is ever missed.
 */
function getProfileCounts(userId: string) {
  return cached(cacheKeys.profileCounts(userId), PROFILE_COUNTS_TTL_SECONDS, async () => {
    const [followers, following, workouts] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.workout.count({ where: { userId } }),
    ]);
    return { followers, following, workouts };
  });
}

async function findUserIdByUsername(username: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw AppError.notFound("User not found");
  return user.id;
}

export async function getProfile(viewerId: string, username: string) {
  const user = await prisma.user.findUnique({ where: { username }, select: profileSelect });
  if (!user) throw AppError.notFound("User not found");

  const [counts, follow] = await Promise.all([
    getProfileCounts(user.id),
    // NOT cached: it's per-viewer, and must be correct right after tapping Follow
    prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: viewerId, followingId: user.id } },
      select: { createdAt: true },
    }),
  ]);
  return { ...user, counts, isFollowing: follow !== null, isMe: user.id === viewerId };
}

/** Idempotent: following someone you already follow is a no-op (PUT semantics). */
export async function follow(followerId: string, username: string) {
  const followingId = await findUserIdByUsername(username);
  // Friendly 400 here; the DB CHECK constraint (no self-follow) is the backstop
  if (followingId === followerId) throw AppError.badRequest("You can't follow yourself");

  await prisma.follow.createMany({ data: [{ followerId, followingId }], skipDuplicates: true });
  await invalidate(cacheKeys.profileCounts(followerId), cacheKeys.profileCounts(followingId));
}

export async function unfollow(followerId: string, username: string) {
  const followingId = await findUserIdByUsername(username);
  await prisma.follow.deleteMany({ where: { followerId, followingId } });
  await invalidate(cacheKeys.profileCounts(followerId), cacheKeys.profileCounts(followingId));
}

export async function searchUsers(viewerId: string, query: string) {
  const users = await prisma.user.findMany({
    where: {
      id: { not: viewerId },
      OR: [
        { username: { startsWith: query.toLowerCase() } },
        { displayName: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { username: "asc" },
    take: 20,
    select: {
      ...profileSelect,
      // One query tells us which results I already follow (no N+1)
      followers: { where: { followerId: viewerId }, select: { followerId: true } },
    },
  });
  return users.map(({ followers, ...u }) => ({ ...u, isFollowing: followers.length > 0 }));
}

export async function updateMe(userId: string, data: { displayName?: string; bio?: string | null }) {
  return prisma.user.update({ where: { id: userId }, data, select: publicUserSelect });
}
