import type { Prisma } from "../../generated/prisma/client.js";

/**
 * THE rule for who can see a workout, as a Prisma `where` fragment:
 *   - your own workouts, whatever their visibility
 *   - anyone's PUBLIC workouts
 *   - FOLLOWERS workouts of people you follow
 *
 * Expressed as a query filter (not an if-statement after loading) so the
 * database filters lists, counts and single lookups with the exact same logic.
 * Feed, profile, detail, likes and comments all use this one function.
 */
export function visibleTo(viewerId: string): Prisma.WorkoutWhereInput {
  return {
    OR: [
      { userId: viewerId },
      { visibility: "PUBLIC" },
      {
        visibility: "FOLLOWERS",
        // `user.followers` = Follow rows where the owner is the one followed
        user: { followers: { some: { followerId: viewerId } } },
      },
    ],
  };
}
