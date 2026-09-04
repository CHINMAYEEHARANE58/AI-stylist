import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export class ApiResponse {
  /** 200 / 201 success with optional data */
  static success<T>(
    res: Response,
    data: T,
    message = 'Success',
    statusCode = 200,
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /** 201 Created */
  static created<T>(res: Response, data: T, message = 'Created'): Response {
    return ApiResponse.success(res, data, message, 201);
  }

  /** Paginated list */
  static paginated<T>(
    res: Response,
    data: T[],
    meta: PaginationMeta,
    message = 'Success',
  ): Response {
    res.setHeader('X-Total-Count', String(meta.total));
    res.setHeader('X-Page', String(meta.page));
    res.setHeader('X-Per-Page', String(meta.perPage));

    return res.status(200).json({
      success: true,
      message,
      data,
      meta,
    });
  }

  /** 204 No content */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
