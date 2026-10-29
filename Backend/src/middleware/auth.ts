import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User, type Role } from "../models/User";
import { AppError } from "../utils/AppError";

export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface TokenPayload {
  sub: string;
  role: Role;
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    algorithm: "HS256",
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

/** Verifies the Bearer token and confirms the user still exists (role is read from the DB, not trusted from the token). */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw AppError.unauthorized();

    let payload: TokenPayload;
    try {
      payload = jwt.verify(header.slice(7), env.JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
    } catch {
      throw AppError.unauthorized("Your session is invalid or has expired. Please log in again.");
    }

    const user = await User.findById(payload.sub).select("role").lean();
    if (!user) throw AppError.unauthorized("Your account no longer exists");

    req.user = { id: String(user._id), role: user.role as Role };
    next();
  } catch (error) {
    next(error);
  }
}

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden());
    next();
  };
