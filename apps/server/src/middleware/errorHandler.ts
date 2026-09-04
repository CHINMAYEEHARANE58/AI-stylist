import type { NextFunction, Request, Response } from 'express';
import type { ZodError } from 'zod';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation error
  if (err.name === 'ZodError') {
    const zodErr = err as ZodError;
    res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: zodErr.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Mongoose duplicate key
  if ((err as NodeJS.ErrnoException).code === '11000') {
    res.status(409).json({
      success: false,
      message: 'A record with that value already exists.',
    });
    return;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid resource identifier.',
    });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, message: 'Invalid token.' });
    return;
  }
  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Token has expired.' });
    return;
  }

  // Operational errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Unknown / programming errors
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });

  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again later.',
    ...(env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
