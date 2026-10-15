import { afterAll, afterEach, describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { closeConnections } from "./helpers.js";

const app = createApp();

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(closeConnections);

describe("GET /api/v1/health (liveness)", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok" });
    expect(typeof res.body.uptime).toBe("number");
  });

  it("sets security headers via helmet", async () => {
    const res = await request(app).get("/api/v1/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("GET /api/v1/health/ready (readiness)", () => {
  it("returns 200 when the database and Redis are reachable", async () => {
    const res = await request(app).get("/api/v1/health/ready");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready", checks: { database: "ok", redis: "ok" } });
  });

  it("returns 503 when the database is down", async () => {
    jest.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(new Error("connection refused"));

    const res = await request(app).get("/api/v1/health/ready");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "unavailable", checks: { database: "error", redis: "ok" } });
  });
});

describe("fallback handling", () => {
  it("returns 404 in the standard error shape for unknown routes", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: "NOT_FOUND", message: "Route GET /api/v1/does-not-exist not found" },
    });
  });

  it("returns 400 INVALID_JSON for a malformed JSON body", async () => {
    const res = await request(app)
      .post("/api/v1/health")
      .set("Content-Type", "application/json")
      .send("{bad");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });
});
