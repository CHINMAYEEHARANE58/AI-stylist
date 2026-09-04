import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

type ValidateTarget = 'body' | 'query' | 'params';

/**
 * Returns an Express middleware that validates req[target] against a Zod schema.
 * On success, replaces req[target] with the parsed (and coerced) data.
 * On failure, calls next(ZodError) — handled by errorHandler.
 */
export function validate(schema: ZodSchema, target: ValidateTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Replace with coerced/transformed data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (req as any)[target] = result.data;
    next();
  };
}
