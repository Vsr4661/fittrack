import { DEFAULT_REST_SEC, remainingSec, useRestTimer } from "@/features/workouts/restTimer";

const T0 = 1_800_000_000_000;
const timer = () => useRestTimer.getState();

beforeEach(() => {
  jest.spyOn(Date, "now").mockReturnValue(T0);
  timer().stop();
});
afterEach(() => jest.restoreAllMocks());

describe("remainingSec", () => {
  it("rounds up, so it shows 1 until the very end, then 0", () => {
    expect(remainingSec(T0 + 1500, T0)).toBe(2);
    expect(remainingSec(T0 + 1, T0)).toBe(1);
    expect(remainingSec(T0, T0)).toBe(0);
  });

  it("never goes negative after the end", () => {
    expect(remainingSec(T0 - 5000, T0)).toBe(0);
  });
});

describe("rest timer store", () => {
  it("starts with the default rest from now", () => {
    timer().start();

    expect(timer().endsAt).toBe(T0 + DEFAULT_REST_SEC * 1000);
    expect(timer().durationSec).toBe(DEFAULT_REST_SEC);
  });

  it("keeps time correctly while 'backgrounded' (it's end-time based)", () => {
    timer().start(60);
    jest.spyOn(Date, "now").mockReturnValue(T0 + 45_000); // 45s later, app was asleep

    expect(remainingSec(timer().endsAt!, Date.now())).toBe(15);
  });

  it("+15 / -15 move the end time and the ring's total", () => {
    timer().start(60);
    timer().adjust(15);
    expect(timer().endsAt).toBe(T0 + 75_000);
    expect(timer().durationSec).toBe(75);

    timer().adjust(-15);
    expect(timer().endsAt).toBe(T0 + 60_000);
  });

  it("-15 past zero ends the rest instead of going negative", () => {
    timer().start(10);
    timer().adjust(-15);

    expect(timer().endsAt).toBeNull();
  });

  it("caps rest at 10 minutes", () => {
    timer().start(590);
    timer().adjust(60);

    expect(timer().endsAt).toBe(T0 + 600_000);
  });

  it("ignores adjustments when nothing is running", () => {
    timer().adjust(15);

    expect(timer().endsAt).toBeNull();
  });
});
