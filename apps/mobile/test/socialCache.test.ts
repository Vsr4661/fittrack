import { QueryClient } from "@tanstack/react-query";
import { adjustCommentCount, applyLike, mapWorkoutInData, updateWorkoutEverywhere } from "@/features/social/cache";
import { workoutKeys } from "@/features/workouts/hooks";

const social = (likeCount: number, likedByMe: boolean, commentCount = 0) => ({ likeCount, likedByMe, commentCount });
const card = (id: string, s = social(0, false)) => ({ id, title: id, social: s });
const infinite = (...pages: ReturnType<typeof card>[][]) => ({
  pages: pages.map((items) => ({ items, nextCursor: null })),
  pageParams: pages.map(() => undefined),
});

describe("applyLike", () => {
  it("likes and unlikes, adjusting the count", () => {
    const liked = applyLike(card("w1", social(4, false)), true);
    expect(liked.social).toEqual(social(5, true));
    expect(applyLike(liked, false).social).toEqual(social(4, false));
  });

  it("is idempotent: liking an already-liked workout changes nothing", () => {
    const w = card("w1", social(5, true));
    expect(applyLike(w, true)).toBe(w); // same object: no re-render
  });

  it("never goes below zero", () => {
    expect(applyLike(card("w1", social(0, true)), false).social.likeCount).toBe(0);
  });
});

describe("mapWorkoutInData", () => {
  it("updates the matching workout inside any page of an infinite list", () => {
    const data = infinite([card("a"), card("b")], [card("c")]);

    const next = mapWorkoutInData(data, "c", (w) => applyLike(w, true)) as typeof data;

    expect(next.pages[1]!.items[0]!.social.likedByMe).toBe(true);
    expect(next.pages[0]).toBe(data.pages[0]); // untouched pages keep their identity
  });

  it("returns the same object when the workout isn't in the list", () => {
    const data = infinite([card("a")]);
    expect(mapWorkoutInData(data, "zzz", (w) => applyLike(w, true))).toBe(data);
  });

  it("updates a single detail entry", () => {
    const detail = card("w1");
    expect((mapWorkoutInData(detail, "w1", (w) => adjustCommentCount(w, 1)) as typeof detail).social.commentCount).toBe(1);
  });

  it("ignores unrelated cache shapes (e.g. the exercise catalog array) and empty data", () => {
    const exercises = [{ id: "ex1", name: "Bench" }];
    expect(mapWorkoutInData(exercises, "ex1", (w) => applyLike(w, true))).toBe(exercises);
    expect(mapWorkoutInData(undefined, "w1", (w) => applyLike(w, true))).toBeUndefined();
  });
});

describe("updateWorkoutEverywhere", () => {
  it("updates every cached copy of a workout (feed, history, profile, detail) in one call", () => {
    // gcTime: Infinity = no garbage-collection timers. With the default (5 min),
    // each cache entry leaves a pending timer and Jest hangs for 5 minutes on exit.
    const qc = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    qc.setQueryData(workoutKeys.feed(), infinite([card("w1"), card("w2")]));
    qc.setQueryData(workoutKeys.list(), infinite([card("w1")]));
    qc.setQueryData(workoutKeys.user("alice"), infinite([card("w1")]));
    qc.setQueryData(workoutKeys.detail("w1"), card("w1"));

    updateWorkoutEverywhere(qc, "w1", (w) => applyLike(w, true));

    const likedIn = (key: readonly unknown[]) =>
      (qc.getQueryData(key) as ReturnType<typeof infinite>).pages[0]!.items[0]!.social.likedByMe;
    expect(likedIn(workoutKeys.feed())).toBe(true);
    expect(likedIn(workoutKeys.list())).toBe(true);
    expect(likedIn(workoutKeys.user("alice"))).toBe(true);
    expect((qc.getQueryData(workoutKeys.detail("w1")) as ReturnType<typeof card>).social.likedByMe).toBe(true);
    // A different workout in the same feed is untouched
    expect((qc.getQueryData(workoutKeys.feed()) as ReturnType<typeof infinite>).pages[0]!.items[1]!.social.likedByMe).toBe(false);
  });
});
