import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// ============================================================
// Global error handling middleware.
// Must be registered LAST in the Express app (after all routes).
// ============================================================

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Multer errors (file too large, wrong type, etc.)
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File too large. Maximum allowed size is ${process.env.MAX_FILE_SIZE_MB ?? 10} MB.`
        : err.message;
    res.status(400).json({ success: false, error: message, code: err.code });
    return;
  }

  // Application-thrown errors with explicit status codes
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Unknown / unhandled errors – log and return 500
  console.error('[Unhandled Error]', err);
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred.'
        : err.message,
  });
}
