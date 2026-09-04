import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/ApiResponse';
import { isDatabaseConnected } from '../config/db';

export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
  const [userCount, itemCount, outfitCount] = await Promise.all([
    prisma.user.count(),
    prisma.clothingItem.count(),
    prisma.outfit.count(),
  ]);

  ApiResponse.success(res, {
    users:            { total: userCount },
    wardrobeItems:    itemCount,
    outfitsGenerated: outfitCount,
    dbConnected:      isDatabaseConnected(),
  });
}

export async function getUsers(_req: Request, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, role: true, createdAt: true,
      profile: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  ApiResponse.success(res, {
    users: users.map((u) => ({
      id:    u.id,
      email: u.email,
      role:  u.role.toLowerCase(),
      name:  [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(' '),
      createdAt: u.createdAt,
    })),
    total: users.length,
  });
}

export async function getModerationQueue(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, { flags: [] });
}
