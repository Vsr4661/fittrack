import { afterAll, afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { SignJWT } from "jose";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { closeConnections, resetState, validUser } from "./helpers.js";

const app = createApp();

beforeEach(resetState);
afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(closeConnections);

const register = (body: object = validUser) => request(app).post("/api/v1/auth/register").send(body);
const login = (body: object) => request(app).post("/api/v1/auth/login").send(body);
const refresh = (refreshToken: string) =>
  request(app).post("/api/v1/auth/refresh").send({ refreshToken });
const me = (accessToken: string) =>
  request(app).get("/api/v1/users/me").set("Authorization", `Bearer ${accessToken}`);

describe("POST /auth/register", () => {
  it("creates a user and returns tokens without exposing the password hash", async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "alex@example.com", username: "alex_lifts" });
    expect(res.body.user).not.toHaveProperty("passwordHash");
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));
  });

  it("stores an argon2id hash, never the plain password", async () => {
    await register();
    const row = await prisma.user.findUniqueOrThrow({ where: { email: "alex@example.com" } });

    expect(row.passwordHash).toMatch(/^\$argon2id\$/);
    expect(row.passwordHash).not.toContain(validUser.password);
  });

  it("stores only a hash of the refresh token", async () => {
    const { body } = await register();
    const stored = await prisma.refreshToken.findFirstOrThrow();

    expect(stored.tokenHash).not.toBe(body.refreshToken);
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects invalid input with field-level errors", async () => {
    const res = await register({ email: "nope", username: "a!", password: "short", displayName: "" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(res.body.error.details.fieldErrors).sort()).toEqual(
      ["displayName", "email", "password", "username"],
    );
  });

  it("rejects a duplicate email case-insensitively", async () => {
    await register();
    const res = await register({ ...validUser, email: "ALEX@example.COM", username: "other" });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Email is already registered");
  });

  it("rejects a duplicate username", async () => {
    await register();
    const res = await register({ ...validUser, email: "new@example.com" });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe("Username is already taken");
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    await register();
  });

  it("logs in with correct credentials", async () => {
    const res = await login({ email: "alex@example.com", password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("alex_lifts");
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  it("gives the same error for a wrong password and an unknown email (no user enumeration)", async () => {
    const wrongPassword = await login({ email: "alex@example.com", password: "wrong-password" });
    const unknownEmail = await login({ email: "ghost@example.com", password: "wrong-password" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it("rate-limits repeated attempts with 429", async () => {
    // register() in beforeEach already used 1 of the 10 slots
    for (let i = 0; i < 9; i++) {
      await login({ email: "alex@example.com", password: "wrong-password" });
    }
    const res = await login({ email: "alex@example.com", password: validUser.password });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe("RATE_LIMITED");
    expect(res.headers["ratelimit-policy"]).toBeDefined();
  });
});

describe("GET /users/me (requireAuth)", () => {
  it("returns the current user for a valid access token", async () => {
    const { body } = await register();
    const res = await me(body.accessToken);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(body.user.id);
  });

  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/v1/users/me");

    expect(res.status).toBe(401);
  });

  it("returns 401 for a forged token signed with a different secret", async () => {
    const { body } = await register();
    const forged = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(body.user.id)
      .setIssuer("fittrack-api")
      .setAudience("fittrack-app")
      .setExpirationTime("15m")
      .sign(new TextEncoder().encode("attacker-secret-attacker-secret-attacker"));

    const res = await me(forged);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns TOKEN_EXPIRED for an expired token so the app knows to refresh", async () => {
    const { body } = await register();
    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(body.user.id)
      .setIssuer("fittrack-api")
      .setAudience("fittrack-app")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.JWT_ACCESS_SECRET));

    const res = await me(expired);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("TOKEN_EXPIRED");
  });
});

describe("POST /auth/refresh (rotation + reuse detection)", () => {
  it("rotates: returns a new pair and the old refresh token stops working", async () => {
    const { body: first } = await register();

    const rotated = await refresh(first.refreshToken);
    expect(rotated.status).toBe(200);
    expect(rotated.body.refreshToken).not.toBe(first.refreshToken);
    expect((await me(rotated.body.accessToken)).status).toBe(200);
  });

  it("detects reuse of a rotated token and revokes the whole family", async () => {
    const { body: first } = await register();
    const { body: second } = await refresh(first.refreshToken); // legit rotation

    // Attacker replays the stolen, already-rotated token
    const replay = await refresh(first.refreshToken);
    expect(replay.status).toBe(401);
    expect(replay.body.error.message).toBe("Refresh token reuse detected");

    // ...which also kills the legit user's newer token (attacker might have it too)
    const afterReuse = await refresh(second.refreshToken);
    expect(afterReuse.status).toBe(401);
  });

  it("rejects an unknown refresh token", async () => {
    const res = await refresh("not-a-real-token");

    expect(res.status).toBe(401);
  });

  it("rejects an expired refresh token", async () => {
    const { body } = await register();
    await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const res = await refresh(body.refreshToken);

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Refresh token expired");
  });

  it("lets only one of two racing refreshes win (atomic rotation)", async () => {
    const { body } = await register();
    // Simulate the race deterministically: both requests read the token row
    // *before* either revokes it, so both pass the "is it revoked?" check.
    const staleRow = await prisma.refreshToken.findFirstOrThrow();
    jest.spyOn(prisma.refreshToken, "findUnique").mockResolvedValue(staleRow as never);

    const first = await refresh(body.refreshToken);
    const second = await refresh(body.refreshToken);

    expect(first.status).toBe(200);
    expect(second.status).toBe(401);
    expect(second.body.error.message).toBe("Refresh token already used");
  });
});

describe("POST /auth/logout", () => {
  it("revokes the session so its refresh token no longer works", async () => {
    const { body } = await register();

    const res = await request(app).post("/api/v1/auth/logout").send({ refreshToken: body.refreshToken });
    expect(res.status).toBe(204);

    expect((await refresh(body.refreshToken)).status).toBe(401);
  });

  it("is idempotent and silent for unknown tokens", async () => {
    const res = await request(app).post("/api/v1/auth/logout").send({ refreshToken: "whatever" });

    expect(res.status).toBe(204);
  });

  it("only logs out that device, not the user's other sessions", async () => {
    const { body: phone } = await register();
    const { body: tablet } = await login({ email: "alex@example.com", password: validUser.password });

    await request(app).post("/api/v1/auth/logout").send({ refreshToken: phone.refreshToken });

    expect((await refresh(tablet.refreshToken)).status).toBe(200);
  });
});
