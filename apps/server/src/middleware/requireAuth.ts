import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import type { AuthPayload } from '../types/express';

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authorization token missing.', 401));
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
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
