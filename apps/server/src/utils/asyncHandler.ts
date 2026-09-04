import type { NextFunction, Request, Response, RequestHandler } from 'express';

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wraps an async route handler and forwards any thrown errors to next().
 * Eliminates try/catch boilerplate in controllers.
 */
export function asyncHandler(fn: AsyncFn): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
