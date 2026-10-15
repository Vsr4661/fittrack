import type { Request, RequestHandler } from "express";
import { errors as joseErrors } from "jose";
import { verifyAccessToken } from "../modules/auth/tokens.js";
import { AppError } from "../utils/AppError.js";

export interface AuthUser {
  id: string;
}

// Adds `req.user` to Express's Request type everywhere in the app
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw AppError.unauthorized("Missing bearer token");
  }

  try {
    const { userId } = await verifyAccessToken(header.slice("Bearer ".length));
    req.user = { id: userId };
  } catch (err) {
    // A distinct code tells the app "refresh and retry" vs "log the user out"
    if (err instanceof joseErrors.JWTExpired) {
      throw new AppError(401, "Access token expired", "TOKEN_EXPIRED");
    }
    throw AppError.unauthorized("Invalid access token");
  }
  next();
};

/** For handlers behind requireAuth: returns the user or fails loudly if the middleware is missing. */
export function getAuthUser(req: Request): AuthUser {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}
