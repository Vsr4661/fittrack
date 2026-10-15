import { QueryClient } from "@tanstack/react-query";
import { applyLikeCount, refreshComments, withLikeCount } from "@/features/realtime/cacheUpdates";
import { socialKeys } from "@/features/social/hooks";
import { workoutKeys } from "@/features/workouts/hooks";

// gcTime: Infinity = no garbage-collection timers (the default 5-minute timer
// keeps Jest waiting to exit), the same setup as socialCache.test.ts
const newClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
const social = (likeCount: number, likedByMe = false) => ({ likeCount, likedByMe, commentCount: 0 });
const workout = (id: string, likeCount: number, likedByMe = false) => ({ id, title: id, social: social(likeCount, likedByMe) });

describe("withLikeCount", () => {
  it("sets the absolute count and leaves likedByMe alone (the event doesn't say who liked)", () => {
    expect(withLikeCount(workout("w1", 2, true), 5).social).toEqual({ likeCount: 5, likedByMe: true, commentCount: 0 });
  });

  it("is idempotent: the echo of my own like (same count) changes nothing", () => {
    const w = workout("w1", 3, true);
    expect(withLikeCount(w, 3)).toBe(w); // same object: no re-render
    expect(withLikeCount(withLikeCount(w, 4), 4).social.likeCount).toBe(4); // a duplicate event can't double-count
  });
});

describe("applyLikeCount", () => {
  it("updates every cached copy of that workout (feed list + detail), and nothing else", () => {
    const qc = newClient();
    qc.setQueryData(workoutKeys.feed(), { pages: [{ items: [workout("w1", 1), workout("w2", 7)], nextCursor: null }], pageParams: [undefined] });
    qc.setQueryData(workoutKeys.detail("w1"), workout("w1", 1));

    applyLikeCount(qc, "w1", 2);

    const feed = qc.getQueryData<{ pages: { items: ReturnType<typeof workout>[] }[] }>(workoutKeys.feed())!;
    expect(feed.pages[0]!.items.map((w) => w.social.likeCount)).toEqual([2, 7]);
    expect(qc.getQueryData<ReturnType<typeof workout>>(workoutKeys.detail("w1"))!.social.likeCount).toBe(2);
  });
});

describe("refreshComments", () => {
  it("marks that workout's comments and detail stale (refetch from REST, never +1)", async () => {
    const qc = newClient();
    qc.setQueryData(socialKeys.comments("w1"), { pages: [] });
    qc.setQueryData(workoutKeys.detail("w1"), workout("w1", 0));
    qc.setQueryData(workoutKeys.detail("w2"), workout("w2", 0));

    refreshComments(qc, "w1");

    expect(qc.getQueryState(socialKeys.comments("w1"))!.isInvalidated).toBe(true);
    expect(qc.getQueryState(workoutKeys.detail("w1"))!.isInvalidated).toBe(true);
    expect(qc.getQueryState(workoutKeys.detail("w2"))!.isInvalidated).toBe(false);
    // ...and the cached count was NOT touched locally
    expect(qc.getQueryData<ReturnType<typeof workout>>(workoutKeys.detail("w1"))!.social.commentCount).toBe(0);
  });
});
