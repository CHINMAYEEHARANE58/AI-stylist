import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middleware/errorHandler';
import { signToken } from '../utils/token';

const mocks = vi.hoisted(() => ({
  clothingCount: vi.fn(), clothingFindMany: vi.fn(), clothingGroupBy: vi.fn(), savedCount: vi.fn(), savedFindMany: vi.fn(),
  historyCount: vi.fn(), outfitItemGroupBy: vi.fn(), outfitGroupBy: vi.fn(), activityFindMany: vi.fn(),
  notificationCount: vi.fn(), notificationFindMany: vi.fn(), notificationFindFirst: vi.fn(),
  notificationUpdateMany: vi.fn(), notificationDelete: vi.fn(),
}));
vi.mock('../config/db', () => ({ prisma: {
  clothingItem: { count: mocks.clothingCount, findMany: mocks.clothingFindMany, groupBy: mocks.clothingGroupBy },
  savedOutfit: { count: mocks.savedCount, findMany: mocks.savedFindMany },
  aIStylingHistory: { count: mocks.historyCount },
  outfitItem: { groupBy: mocks.outfitItemGroupBy }, outfit: { groupBy: mocks.outfitGroupBy },
  userActivity: { findMany: mocks.activityFindMany },
  notification: { count: mocks.notificationCount, findMany: mocks.notificationFindMany,
    findFirst: mocks.notificationFindFirst, updateMany: mocks.notificationUpdateMany,
    delete: mocks.notificationDelete },
} }));
import insightsRoutes from './insightsRoutes';
const cookie = (id: string) => `closetai_access=${signToken({ id, email: `${id}@example.com`, name: id, role: 'user' })}`;
function app() { const server = express(); server.use(express.json()); server.use(cookieParser());
  server.use('/insights', insightsRoutes); server.use(errorHandler); return server; }

describe('computed insights, dashboard and notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clothingCount.mockImplementation(async ({ where }: { where: { favorite?: boolean } }) => where.favorite ? 1 : 2);
    mocks.clothingFindMany.mockResolvedValue([
      { id: 'one', category: 'tops', colors: ['Ivory'], occasions: ['Office'], aesthetics: ['Minimal'], seasons: ['Summer'], favorite: true },
      { id: 'two', category: 'bottoms', colors: ['Black'], occasions: ['Office'], aesthetics: ['Minimal'], seasons: ['Summer'], favorite: false },
    ]);
    mocks.clothingGroupBy.mockResolvedValue([{ category: 'tops', _count: { _all: 1 } },
      { category: 'bottoms', _count: { _all: 1 } }]);
    mocks.savedCount.mockResolvedValue(1); mocks.savedFindMany.mockResolvedValue([]);
    mocks.historyCount.mockResolvedValue(2);
    mocks.outfitItemGroupBy.mockResolvedValue([{ snapshotCategory: 'tops', _count: { _all: 3 } }]);
    mocks.outfitGroupBy.mockResolvedValue([{ occasion: 'Office', _count: { _all: 2 } }]);
    mocks.activityFindMany.mockResolvedValue([{ id: 'activity', type: 'wardrobe_upload', createdAt: new Date() }]);
    mocks.notificationCount.mockImplementation(async ({ where }: { where: { readAt?: null } }) =>
      where.readAt === null ? 7 : 8);
    mocks.notificationFindMany.mockResolvedValue([{ id: 'notice-a', userId: 'user-a', type: 'OUTFIT',
      title: 'Event added', message: 'A real event was added.', readAt: null, createdAt: new Date() }]);
    mocks.notificationFindFirst.mockImplementation(async ({ where }: { where: { userId: string; id: string } }) =>
      where.userId === 'user-a' && where.id === 'notice-a' ? { id: 'notice-a', readAt: null } : null);
    mocks.notificationUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('computes wardrobe distributions and recorded outfit usage, not invented trends', async () => {
    const server = app();
    expect((await request(server).get('/insights/wardrobe')).status).toBe(401);
    const result = await request(server).get('/insights/wardrobe').set('Cookie', cookie('user-a'));
    expect(result.status).toBe(200);
    expect(result.body.data.summary).toMatchObject({ totalItems: 2, favoriteItems: 1,
      savedOutfits: 1, outfitsGenerated: 2 });
    expect(result.body.data.colors).toEqual(expect.arrayContaining([{ label: 'Ivory', value: 1 }]));
    expect(result.body.data.outfitUsageCategories).toEqual([{ label: 'tops', value: 3 }]);
    expect((await request(server).get('/insights/trends').set('Cookie', cookie('user-a'))).body.data.trends).toEqual([]);
  });

  it('keeps counts exact even when recent dashboard notifications are bounded', async () => {
    const result = await request(app()).get('/insights/dashboard').set('Cookie', cookie('user-a'));
    expect(result.status).toBe(200);
    expect(result.body.data.stats).toMatchObject({ wardrobeItems: 2, savedOutfits: 1,
      unreadNotifications: 7, outfitsGenerated: 2 });
    expect(result.body.data.notifications).toHaveLength(1);
    expect(mocks.notificationFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-a' }, take: 5 }));
  });

  it('supports unread counts, pagination, read-all and foreign-user isolation', async () => {
    const server = app();
    expect((await request(server).get('/insights/notifications/unread-count').set('Cookie', cookie('user-a'))).body.data.unreadCount).toBe(7);
    expect((await request(server).get('/insights/notifications?page=0').set('Cookie', cookie('user-a'))).status).toBe(422);
    expect((await request(server).get('/insights/notifications?page=2').set('Cookie', cookie('user-a'))).status).toBe(200);
    expect(mocks.notificationFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-a' }, skip: 20, take: 20 }));
    expect((await request(server).patch('/insights/notifications/notice-a/read').set('Cookie', cookie('user-b'))).status).toBe(404);
    expect((await request(server).patch('/insights/notifications/notice-a/read').set('Cookie', cookie('user-a'))).status).toBe(200);
    expect(mocks.notificationUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'notice-a', userId: 'user-a', readAt: null } }));
    expect((await request(server).post('/insights/notifications/mark-all-read').set('Cookie', cookie('user-a'))).status).toBe(200);
    expect(mocks.notificationUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-a', readAt: null } }));
  });
});
