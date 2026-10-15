import { describe, expect, it } from "@jest/globals";
import express from "express";
import { pinoHttp } from "pino-http";
import request from "supertest";
import { z } from "zod";
import { logger } from "../src/lib/logger.js";
import { errorHandler } from "../src/middleware/errorHandler.js";
import { AppError } from "../src/utils/AppError.js";

// A throwaway app with routes that throw each kind of error, so the
// error handler is tested in isolation from any real route.
const app = express();
app.use(pinoHttp({ logger }));
app.get("/app-error", () => {
  throw AppError.conflict("Username already taken");
});
app.get("/zod-error", () => {
  z.object({ email: z.email() }).parse({ email: "not-an-email" });
});
app.get("/async-crash", async () => {
  // Express 5 forwards rejected promises to the error handler automatically
  throw new Error("db password is hunter2");
});
app.use(errorHandler);

describe("errorHandler", () => {
  it("maps AppError to its status and code", async () => {
    const res = await request(app).get("/app-error");

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: { code: "CONFLICT", message: "Username already taken" } });
  });

  it("maps ZodError to 400 with field-level details", async () => {
    const res = await request(app).get("/zod-error");

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.fieldErrors.email).toHaveLength(1);
  });

  it("hides unexpected errors behind a generic 500", async () => {
    const res = await request(app).get("/async-crash");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
    expect(JSON.stringify(res.body)).not.toContain("hunter2");
  });
});
