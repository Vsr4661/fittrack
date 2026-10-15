import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { env } from "../../config/env.js";

const secret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const ISSUER = "fittrack-api";
const AUDIENCE = "fittrack-app";

// ─── Access tokens: short-lived, stateless JWTs ────────

export function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(secret);
}

/** Throws a jose error if the token is invalid, expired, or not ours. */
export async function verifyAccessToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"], // pin the algorithm: never trust the token's own "alg" header
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (!payload.sub) throw new Error("Token has no subject");
  return { userId: payload.sub };
}

// ─── Refresh tokens: long-lived, opaque, stored hashed ─

export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url"); // 256 bits of entropy
}

// SHA-256 (fast) is right here, unlike passwords: the input is already 256 random
// bits, so there is nothing to brute-force. A DB leak still yields no usable tokens.
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}
