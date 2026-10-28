import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";
import { AppError } from "../utils/AppError";

type Source = "body" | "query" | "params";

/**
 * Validates a request part with a Zod schema. Parsed values are stored on
 * `res.locals[source]` (Express 5 makes `req.query` read-only); the body is also replaced in place.
 */
export const validate =
  (schema: ZodTypeAny, source: Source = "body") =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      const first = Object.values(fieldErrors).flat()[0] ?? result.error.issues[0]?.message ?? "Invalid request";
      return next(AppError.badRequest(first, fieldErrors));
    }
    res.locals[source] = result.data;
    if (source === "body") req.body = result.data;
    next();
  };
