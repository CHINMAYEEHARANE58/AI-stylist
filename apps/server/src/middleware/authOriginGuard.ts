import type { NextFunction, Request, Response } from 'express';
import { isAllowedOrigin } from '../config/origins';
import { AppError } from '../utils/AppError';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Reject browser cross-origin writes unless they originate from a configured frontend. */
export function authOriginGuard(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }
  const origin = req.get('origin');
  if (!origin || isAllowedOrigin(origin)) {
    return next();
  }
  next(new AppError('Request origin is not allowed.', 403, true, 'INVALID_ORIGIN'));
}
