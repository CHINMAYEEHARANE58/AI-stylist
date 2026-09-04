import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

function param(req: Request, key: string): string {
  const v = req.params[key];
  if (!v || Array.isArray(v)) throw new Error(`Missing param: ${key}`);
  return v;
}

// ── Notifications ──────────────────────────────────────────────────────

const notifQuerySchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  perPage:   z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.enum(['true', 'false']).optional(),
  type:       z.string().optional(),
});

export async function getNotifications(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const query  = notifQuerySchema.parse(req.query);

  const where: Record<string, unknown> = { userId };
  if (query.unreadOnly === 'true') where['readAt'] = null;
  if (query.type) where['type'] = query.type.toUpperCase();

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
  if (!notif) throw new AppError('Notification not found.', 404);

  const updated = await prisma.notification.update({
    where: { id: notif.id },
    data: { readAt: new Date() },
  });
  ApiResponse.success(res, updated, 'Marked as read.');
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
  if (!existing) throw new AppError('Notification not found.', 404);
  await prisma.notification.delete({ where: { id: existing.id } });
  ApiResponse.noContent(res);
}

// ── Wardrobe insights ─────────────────────────────────────────────────

export async function getWardrobeInsights(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const items = await prisma.clothingItem.findMany({
    where: { userId, archived: false },
    select: {
      id: true, category: true, colors: true, occasions: true,
      aesthetics: true, seasons: true, favorite: true,
    },
  });

  // Category distribution
  const categoryMap: Record<string, number> = {};
  const colorMap: Record<string, number>    = {};
  const aestheticMap: Record<string, number> = {};
  const occasionMap: Record<string, number>  = {};

  for (const item of items) {
    categoryMap[item.category] = (categoryMap[item.category] ?? 0) + 1;
    for (const c of item.colors) colorMap[c] = (colorMap[c] ?? 0) + 1;
    for (const a of item.aesthetics) aestheticMap[a] = (aestheticMap[a] ?? 0) + 1;
    for (const o of item.occasions) occasionMap[o] = (occasionMap[o] ?? 0) + 1;
  }

  const topN = (map: Record<string, number>, n = 6) =>
    Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([label, value]) => ({ label, value }));

  // Wardrobe gaps: categories that are missing or underrepresented
  const idealCategories = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'];
  const gaps = idealCategories
    .filter((c) => !categoryMap[c] || categoryMap[c] < 2)
    .map((c) => ({
      title: c.charAt(0).toUpperCase() + c.slice(1),
      priority: (!categoryMap[c] ? 'High' : 'Medium') as 'High' | 'Medium' | 'Low',
      reason: `${!categoryMap[c] ? 'No' : 'Few'} ${c} in your wardrobe limits outfit combinations.`,
    }));

  const [savedOutfits, outfitCount] = await Promise.all([
    prisma.savedOutfit.count({ where: { userId } }),
    prisma.outfit.count({ where: { userId } }),
  ]);

  ApiResponse.success(res, {
    summary: {
      totalItems: items.length,
      favoriteItems: items.filter((i) => i.favorite).length,
      savedOutfits,
      outfitsGenerated: outfitCount,
    },
    categories: topN(categoryMap, 8),
    colors: topN(colorMap, 8),
    aesthetics: topN(aestheticMap, 6),
    occasions: topN(occasionMap, 6),
    wardrobeGaps: gaps,
  });
}

export async function getTrendInsights(_req: Request, res: Response): Promise<void> {
  // Static trend data — can be made dynamic with AI later
  ApiResponse.success(res, {
    trends: [
      { title: 'Chocolate & ivory contrast', matchScore: 91, detail: 'Warm neutrals trending for polished day-to-night styling.' },
      { title: 'Soft tailoring',             matchScore: 84, detail: 'Structured blazers with relaxed denim performing well for office and travel.' },
      { title: 'Metallic accents',           matchScore: 78, detail: 'Gold jewellery is a lightweight way to refresh minimal outfits this season.' },
      { title: 'Quiet luxury fabrics',       matchScore: 88, detail: 'Cashmere, wool, and satin continue to dominate editorial and street looks.' },
    ],
  });
}

export async function getDashboardSummary(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const [wardrobeCount, savedOutfitCount, notifications, recentItems, recentSaved] = await Promise.all([
    prisma.clothingItem.count({ where: { userId, archived: false } }),
    prisma.savedOutfit.count({ where: { userId } }),
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
  ]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  ApiResponse.success(res, {
    stats: {
      wardrobeItems: wardrobeCount,
      savedOutfits:  savedOutfitCount,
      unreadNotifications: unreadCount,
    },
    recentWardrobeItems: recentItems,
    recentSavedOutfits: recentSaved,
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
  if (diffMins < 1)   return 'Just now';
  if (diffMins < 60)  return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}
