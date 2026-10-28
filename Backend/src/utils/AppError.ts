export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, message, details, "BAD_REQUEST");
  }
  static unauthorized(message = "Authentication required") {
    return new AppError(401, message, undefined, "UNAUTHORIZED");
  }
  static forbidden(message = "You do not have permission to perform this action") {
    return new AppError(403, message, undefined, "FORBIDDEN");
  }
  static notFound(message = "Resource not found") {
    return new AppError(404, message, undefined, "NOT_FOUND");
  }
  static conflict(message: string) {
    return new AppError(409, message, undefined, "CONFLICT");
  }
}
