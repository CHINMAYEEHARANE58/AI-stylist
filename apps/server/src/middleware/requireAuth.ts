import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import type { AuthPayload } from '../types/express';
import { ACCESS_COOKIE } from '../services/sessionService';
import { verifyToken } from '../utils/token';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : req.cookies?.[ACCESS_COOKIE] as string | undefined;

  if (!token) {
    return next(new AppError('Authorization token missing.', 401));
  }

  try {
    const decoded = verifyToken(token) as AuthPayload;
    req.user = decoded;
    next();
  } catch (err) {
    next(err); // JWT errors handled by errorHandler
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AppError('Not authenticated.', 401));
  }
  if (req.user.role !== 'admin') {
    return next(new AppError('Admin access required.', 403));
  }
  next();
}
