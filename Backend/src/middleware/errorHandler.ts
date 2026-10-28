import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { AppError } from "../utils/AppError";
import { removeUpload } from "./upload";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// Express recognises error handlers by their four-argument signature.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Never leave an orphaned upload behind when the request fails; finish the cleanup before responding.
  const cleanup = req.file ? removeUpload(req.file.filename).catch(() => undefined) : Promise.resolve();

  let status = 500;
  let message = "Something went wrong. Please try again later.";
  let details: unknown;

  if (err instanceof AppError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "Image is too large" : err.message;
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = Object.values(err.errors)[0]?.message ?? "Validation failed";
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = "Invalid identifier";
  } else if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
    status = 409;
    message = "A record with these details already exists";
  } else if (err instanceof SyntaxError && "body" in err) {
    status = 400;
    message = "Malformed JSON body";
  }

  if (!(err instanceof AppError)) console.error(err);

  void cleanup.then(() => {
    res.status(status).json({ success: false, error: { message, ...(details ? { details } : {}) } });
  });
}
