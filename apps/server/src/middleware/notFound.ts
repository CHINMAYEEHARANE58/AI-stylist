import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('The requested resource was not found.', 404));
}
