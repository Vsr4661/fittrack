import MockAdapter from "axios-mock-adapter";
import { authClient, endSession, restoreSession } from "@/features/auth/session";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { tokenStorage } from "@/lib/tokenStorage";
import { useAuthStore } from "@/stores/authStore";

const apiMock = new MockAdapter(api);
const authMock = new MockAdapter(authClient);

const unauthorized = [401, { error: { code: "TOKEN_EXPIRED", message: "Access token expired" } }] as const;

async function signedInAs(accessToken: string, refreshToken: string) {
  await tokenStorage.setRefreshToken(refreshToken);
  useAuthStore.getState().signIn(accessToken);
}

beforeEach(async () => {
  apiMock.reset();
  authMock.reset();
  await tokenStorage.clear();
  queryClient.clear();
  useAuthStore.setState({ status: "loading", accessToken: null });
});

describe("api client", () => {
  it("attaches the in-memory access token to requests", async () => {
    await signedInAs("access-1", "refresh-1");
    apiMock.onGet("/users/me").reply((config) => [200, { sent: config.headers?.Authorization }]);

    const { data } = await api.get("/users/me");

    expect(data.sent).toBe("Bearer access-1");
  });

  it("refreshes ONCE for parallel 401s, then retries every request", async () => {
    await signedInAs("expired", "refresh-1");
    // The server accepts only the new token
    apiMock.onGet("/workouts").reply((config) =>
      config.headers?.Authorization === "Bearer fresh" ? [200, { ok: true }] : [...unauthorized],
    );
    authMock.onPost("/auth/refresh").reply(200, { accessToken: "fresh", refreshToken: "refresh-2" });

    const results = await Promise.all([api.get("/workouts"), api.get("/workouts"), api.get("/workouts")]);

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(authMock.history.post).toHaveLength(1); // single-flight
    expect(JSON.parse(authMock.history.post[0]!.data)).toEqual({ refreshToken: "refresh-1" });
    expect(await tokenStorage.getRefreshToken()).toBe("refresh-2"); // rotated token persisted
    expect(useAuthStore.getState().accessToken).toBe("fresh");
  });

  it("signs the user out when the server rejects the refresh token", async () => {
    await signedInAs("expired", "revoked");
    apiMock.onGet("/workouts").reply(...unauthorized);
    authMock.onPost("/auth/refresh").reply(401, { error: { code: "UNAUTHORIZED", message: "nope" } });

    await expect(api.get("/workouts")).rejects.toMatchObject({ response: { status: 401 } });

    expect(useAuthStore.getState().status).toBe("signedOut");
    expect(await tokenStorage.getRefreshToken()).toBeNull();
  });

  it("keeps the session when refresh fails because the network is down", async () => {
    await signedInAs("expired", "refresh-1");
    apiMock.onGet("/workouts").reply(...unauthorized);
    authMock.onPost("/auth/refresh").networkError();

    await expect(api.get("/workouts")).rejects.toBeDefined();

    expect(useAuthStore.getState().status).toBe("signedIn");
    expect(await tokenStorage.getRefreshToken()).toBe("refresh-1");
  });

  it("does not try to refresh on a 401 from an unauthenticated request (wrong password)", async () => {
    // A leftover refresh token exists, so a buggy client WOULD have something to refresh with
    await tokenStorage.setRefreshToken("leftover");
    useAuthStore.getState().clear();
    apiMock.onPost("/auth/login").reply(401, { error: { code: "UNAUTHORIZED", message: "Invalid email or password" } });

    await expect(api.post("/auth/login", {})).rejects.toMatchObject({ response: { status: 401 } });

    expect(authMock.history.post).toHaveLength(0);
  });

  it("retries only once if the refreshed token is also rejected", async () => {
    await signedInAs("expired", "refresh-1");
    // Rejects every token. Bounded so a regression (infinite retry loop) fails
    // fast with a wrong count instead of hanging the test run forever.
    let calls = 0;
    apiMock.onGet("/workouts").reply(() => (++calls > 5 ? [500, {}] : [...unauthorized]));
    authMock.onPost("/auth/refresh").reply(200, { accessToken: "fresh", refreshToken: "refresh-2" });

    await expect(api.get("/workouts")).rejects.toMatchObject({ response: { status: 401 } });

    expect(apiMock.history.get).toHaveLength(2); // original + one retry, no loop
  });
});

describe("restoreSession (app launch)", () => {
  it("goes to signedOut when no refresh token is stored", async () => {
    await restoreSession();

    expect(useAuthStore.getState().status).toBe("signedOut");
    expect(authMock.history.post).toHaveLength(0);
  });

  it("exchanges a stored refresh token for a live session", async () => {
    await tokenStorage.setRefreshToken("refresh-1");
    authMock.onPost("/auth/refresh").reply(200, { accessToken: "fresh", refreshToken: "refresh-2" });

    await restoreSession();

    expect(useAuthStore.getState()).toMatchObject({ status: "signedIn", accessToken: "fresh" });
    expect(await tokenStorage.getRefreshToken()).toBe("refresh-2");
  });

  it("goes to signedOut when the stored token was revoked", async () => {
    await tokenStorage.setRefreshToken("revoked");
    authMock.onPost("/auth/refresh").reply(401, {});

    await restoreSession();

    expect(useAuthStore.getState().status).toBe("signedOut");
  });
});

describe("endSession (logout)", () => {
  it("clears local state immediately, even if the server is unreachable", async () => {
    await signedInAs("access-1", "refresh-1");
    queryClient.setQueryData(["me"], { id: "user-1" });
    authMock.onPost("/auth/logout").networkError();

    await endSession();

    expect(useAuthStore.getState()).toMatchObject({ status: "signedOut", accessToken: null });
    expect(await tokenStorage.getRefreshToken()).toBeNull();
    expect(queryClient.getQueryData(["me"])).toBeUndefined(); // no data leaks to the next user
  });
});
