import { randomUUID } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { Prisma } from "../../generated/prisma/client.js";
import { logger } from "../../lib/logger.js";
import { prisma, type Tx } from "../../lib/prisma.js";
import { AppError } from "../../utils/AppError.js";
import { publicUserSelect } from "../users/users.select.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";
import {
  generateRefreshToken,
  hashToken,
  refreshTokenExpiry,
  signAccessToken,
} from "./tokens.js";

type Db = Tx | typeof prisma;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Business logic only: no req/res here, so it's reusable and easy to test.

export async function register(input: RegisterInput) {
  // Friendly message for the common case...
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
    select: { email: true },
  });
  if (existing) {
    throw AppError.conflict(
      existing.email === input.email ? "Email is already registered" : "Username is already taken",
    );
  }

  // Argon2id with library defaults (19 MiB memory, 2 passes) = OWASP's recommended baseline
  const passwordHash = await hash(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        passwordHash,
      },
      select: publicUserSelect,
    });
    return { user, ...(await issueTokens(prisma, user.id)) };
  } catch (err) {
    // ...and the unique constraint as the real guarantee, for two signups racing each other
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw AppError.conflict("Email or username is already taken");
    }
    throw err;
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...publicUserSelect, passwordHash: true },
  });

  // Always run verify, even for unknown emails, so response time doesn't
  // reveal which emails have accounts (timing-based user enumeration).
  const valid = await verify(user?.passwordHash ?? (await getDummyHash()), input.password);
  if (!user || !valid) {
    throw AppError.unauthorized("Invalid email or password");
  }

  const { passwordHash: _omit, ...publicUser } = user;
  return { user: publicUser, ...(await issueTokens(prisma, user.id)) };
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
  });
  if (!stored) throw AppError.unauthorized("Invalid refresh token");

  if (stored.revokedAt) {
    // A rotated token came back: either an attacker or the real user is replaying
    // a stolen copy. We can't tell which, so kill the whole session family.
    await revokeFamily(stored.familyId);
    logger.warn({ userId: stored.userId, familyId: stored.familyId }, "Refresh token reuse detected");
    throw AppError.unauthorized("Refresh token reuse detected");
  }
  if (stored.expiresAt <= new Date()) {
    throw AppError.unauthorized("Refresh token expired");
  }

  return prisma.$transaction(async (tx) => {
    // Conditional update = atomic compare-and-swap. If two requests race with the
    // same token, only one sees count === 1. The loser is almost always the same
    // app firing two requests at once (not theft), so it gets a plain 401 instead
    // of revoking the family. The mobile client prevents this with a single-flight refresh.
    const { count } = await tx.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) {
      throw AppError.unauthorized("Refresh token already used");
    }
    return issueTokens(tx, stored.userId, stored.familyId);
  });
}

/** Ends the session on this device. Idempotent and silent: never reveals if the token existed. */
export async function logout(refreshToken: string): Promise<void> {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    select: { familyId: true },
  });
  if (stored) await revokeFamily(stored.familyId);
}

// ─── Helpers ───────────────────────────────────────────

async function issueTokens(db: Db, userId: string, familyId: string = randomUUID()): Promise<AuthTokens> {
  const refreshToken = generateRefreshToken();
  await db.refreshToken.create({
    data: { userId, familyId, tokenHash: hashToken(refreshToken), expiresAt: refreshTokenExpiry() },
  });
  return { accessToken: await signAccessToken(userId), refreshToken };
}

function revokeFamily(familyId: string) {
  return prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hash("timing-equalizer-not-a-real-password");
  return dummyHash;
}
