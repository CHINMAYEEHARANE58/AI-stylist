import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { isDatabaseConnected } from '../config/db';

export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, {
    users:            { total: 4281, active: 812 },
    outfitsGenerated: 28_450,
    wardrobeItems:    34_920,
    recommendations:  { ctr: 67, accuracy: 92 },
    dbConnected:      isDatabaseConnected(),
  });
}

export async function getUsers(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, {
    users: [
      { id: 'u1', name: 'Maya Kapoor',  email: 'maya@closetai.com', role: 'user',  createdAt: '2025-01-01' },
      { id: 'u2', name: 'Admin User',   email: 'admin@closetai.com', role: 'admin', createdAt: '2024-12-01' },
    ],
    total: 4281,
  });
}

export async function getModerationQueue(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, {
    flags: [
      { type: 'image_quality', count: 3, status: 'pending' },
      { type: 'stale_price',   count: 2, status: 'pending' },
    ],
  });
}
