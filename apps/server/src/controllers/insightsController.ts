import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

function param(req: Request, key: string): string {
  const v = req.params[key];
  if (!v || Array.isArray(v)) {throw new Error(`Missing param: ${key}`);}
  return v;
}

// ── Notifications ──────────────────────────────────────────────────────

const notifQuerySchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  perPage:   z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.enum(['true', 'false']).optional(),
  type:       z.enum(['OUTFIT', 'WEATHER', 'SALE', 'TREND', 'SYSTEM']).optional(),
}).strict();

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const query  = notifQuerySchema.parse(req.query);

  const where: Record<string, unknown> = { userId };
  if (query.unreadOnly === 'true') {where['readAt'] = null;}
  if (query.type) {where['type'] = query.type;}

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
  ]);

  const unreadCount = await prisma.notification.count({ where: { userId, readAt: null } });

  // Format for frontend compatibility
  const formatted = notifications.map((n) => ({
    id:      n.id,
    type:    n.type.toLowerCase(),
    title:   n.title,
    message: n.message,
    read:    !!n.readAt,
    time:    formatRelativeTime(n.createdAt),
    createdAt: n.createdAt,
  }));

  ApiResponse.paginated(res, formatted, {
    page: query.page,
    perPage: query.perPage,
    total,
    totalPages: Math.ceil(total / query.perPage),
  }, `${unreadCount} unread`);
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const notif = await prisma.notification.findFirst({ where: { id, userId } });
  if (!notif) {throw new AppError('Notification not found.', 404);}

  if (!notif.readAt) {await prisma.notification.updateMany({
    where: { id, userId, readAt: null }, data: { readAt: new Date() },
  });}
  ApiResponse.success(res, { id, read: true }, 'Marked as read.');
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const count = await prisma.notification.count({ where: { userId: req.user!.id, readAt: null } });
  ApiResponse.success(res, { unreadCount: count });
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  ApiResponse.success(res, { updated: result.count }, 'All notifications marked as read.');
}

export async function deleteNotification(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const existing = await prisma.notification.findFirst({ where: { id, userId } });
  if (!existing) {throw new AppError('Notification not found.', 404);}
  await prisma.notification.delete({ where: { id: existing.id } });
  ApiResponse.noContent(res);
}

// ── Wardrobe insights ─────────────────────────────────────────────────

export async function getWardrobeInsights(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const idealCategories = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'];
  const [totalItems, favoriteItems, savedOutfits, outfitsGenerated, items, categoryCounts, coreCounts, usage, outfitOccasions, recentSavedOutfits] = await Promise.all([
    prisma.clothingItem.count({ where: { userId, archived: false } }),
    prisma.clothingItem.count({ where: { userId, archived: false, favorite: true } }),
    prisma.savedOutfit.count({ where: { userId } }),
    prisma.aIStylingHistory.count({ where: { userId, requestType: 'outfit_generation' } }),
    prisma.clothingItem.findMany({
    where: { userId, archived: false },
    select: {
      id: true, category: true, colors: true, occasions: true,
      aesthetics: true, seasons: true,
    }, take: 2000, orderBy: { createdAt: 'desc' },
    }),
    prisma.clothingItem.groupBy({ by: ['category'], where: { userId, archived: false },
      _count: { _all: true }, orderBy: { _count: { category: 'desc' } }, take: 100 }),
    Promise.all(idealCategories.map((category) => prisma.clothingItem.count({ where: {
      userId, archived: false, category: { equals: category, mode: 'insensitive' },
    } }))),
    prisma.outfitItem.groupBy({ by: ['snapshotCategory'], where: { outfit: { userId } },
      _count: { _all: true }, orderBy: { _count: { snapshotCategory: 'desc' } }, take: 8 }),
    prisma.outfit.groupBy({ by: ['occasion'], where: { userId, occasion: { not: null } },
      _count: { _all: true }, orderBy: { _count: { occasion: 'desc' } }, take: 8 }),
    prisma.savedOutfit.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 6,
      select: { id: true, createdAt: true, outfit: { select: { title: true, occasion: true } } } }),
  ]);

  // Category distribution
  const categoryMap: Record<string, number> = Object.fromEntries(categoryCounts.map((row) => [row.category, row._count._all]));
  const colorMap: Record<string, number>    = {};
  const aestheticMap: Record<string, number> = {};
  const occasionMap: Record<string, number>  = {};

  for (const item of items) {
    for (const c of item.colors) {colorMap[c] = (colorMap[c] ?? 0) + 1;}
    for (const a of item.aesthetics) {aestheticMap[a] = (aestheticMap[a] ?? 0) + 1;}
    for (const o of item.occasions) {occasionMap[o] = (occasionMap[o] ?? 0) + 1;}
  }

  const topN = (map: Record<string, number>, n = 6) =>
    Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([label, value]) => ({ label, value }));

  // Wardrobe gaps: categories that are missing or underrepresented
  const coreMap = Object.fromEntries(idealCategories.map((category, index) => [category, coreCounts[index]]));
  const gaps = idealCategories
    .filter((c) => coreMap[c] < 2)
    .map((c) => ({
      title: c.charAt(0).toUpperCase() + c.slice(1),
      priority: (!coreMap[c] ? 'High' : 'Medium') as 'High' | 'Medium' | 'Low',
      reason: `${!coreMap[c] ? 'No' : 'Few'} ${c} in your wardrobe limits outfit combinations.`,
    }));

  ApiResponse.success(res, {
    summary: {
      totalItems,
      favoriteItems,
      savedOutfits,
      outfitsGenerated,
    },
    sampled: totalItems > items.length,
    categories: topN(categoryMap, 8),
    colors: topN(colorMap, 8),
    aesthetics: topN(aestheticMap, 6),
    occasions: topN(occasionMap, 6),
    wardrobeGaps: gaps,
    outfitUsageCategories: usage.map((row) => ({ label: row.snapshotCategory, value: row._count._all })),
    outfitOccasions: outfitOccasions.map((row) => ({ label: row.occasion, value: row._count._all })),
    recentSavedOutfits,
  });
}

export async function getTrendInsights(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, { trends: [], source: null, message: 'No verified market-trend provider is configured.' });
}

export async function getDashboardSummary(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const [wardrobeCount, savedOutfitCount, unreadCount, generatedCount, notifications, recentItems, recentSaved, recentActivity] = await Promise.all([
    prisma.clothingItem.count({ where: { userId, archived: false } }),
    prisma.savedOutfit.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.aIStylingHistory.count({ where: { userId, requestType: 'outfit_generation' } }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.clothingItem.findMany({
      where: { userId, archived: false },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    prisma.savedOutfit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      include: { outfit: { include: { items: { include: { clothingItem: true }, take: 3 } } } },
    }),
    prisma.userActivity.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5,
      select: { id: true, type: true, createdAt: true } }),
  ]);

  ApiResponse.success(res, {
    stats: {
      wardrobeItems: wardrobeCount,
      savedOutfits:  savedOutfitCount,
      unreadNotifications: unreadCount,
      outfitsGenerated: generatedCount,
    },
    recentWardrobeItems: recentItems,
    recentSavedOutfits: recentSaved,
    recentActivity,
    notifications: notifications.map((n) => ({
      id:      n.id,
      type:    n.type.toLowerCase(),
      title:   n.title,
      message: n.message,
      read:    !!n.readAt,
      time:    formatRelativeTime(n.createdAt),
    })),
  });
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const diffMs   = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1)   {return 'Just now';}
  if (diffMins < 60)  {return `${diffMins} min ago`;}
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {return `${diffHours} hr ago`;}
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {return 'Yesterday';}
  return `${diffDays} days ago`;
}
