import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middleware/errorHandler';
import { signToken } from '../utils/token';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), clothingFindMany: vi.fn(), outfitCreate: vi.fn(), outfitUpdate: vi.fn(),
  savedCreate: vi.fn(), savedCount: vi.fn(), savedFindMany: vi.fn(), savedFindFirst: vi.fn(),
  savedFindUniqueOrThrow: vi.fn(), savedUpdate: vi.fn(), savedDelete: vi.fn(),
}));
vi.mock('../config/db', () => ({ prisma: {
  $transaction: mocks.transaction,
  savedOutfit: { count: mocks.savedCount, findMany: mocks.savedFindMany, findFirst: mocks.savedFindFirst, delete: mocks.savedDelete },
} }));
vi.mock('../services/ai/index', () => ({ getAIProvider: vi.fn() }));
import outfitRoutes from './outfitRoutes';

const userACookie = `closetai_access=${signToken({ id: 'user-a', email: 'a@example.com', name: 'User A', role: 'user' })}`;
const userBCookie = `closetai_access=${signToken({ id: 'user-b', email: 'b@example.com', name: 'User B', role: 'user' })}`;
const tx = {
  clothingItem: { findMany: mocks.clothingFindMany },
  outfit: { create: mocks.outfitCreate, update: mocks.outfitUpdate },
  savedOutfit: { create: mocks.savedCreate, findFirst: mocks.savedFindFirst, update: mocks.savedUpdate, findUniqueOrThrow: mocks.savedFindUniqueOrThrow },
};
const saved = {
  id: 'saved-a', userId: 'user-a', outfitId: 'outfit-a', collection: 'Office', notes: null,
  outfit: { id: 'outfit-a', userId: 'user-a', title: 'Office look', favorite: false,
    items: [{ id: 'join-a', snapshotName: 'Ivory Top', snapshotCategory: 'tops', clothingItem: { id: 'item-a', name: 'Ivory Top' } }] },
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/outfits', outfitRoutes);
  app.use(errorHandler);
  return app;
}

describe('saved outfits and lookbooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
    mocks.clothingFindMany.mockResolvedValue([{ id: 'item-a', name: 'Ivory Top', category: 'tops' }, { id: 'item-b', name: 'Black Skirt', category: 'skirts' }]);
    mocks.outfitCreate.mockResolvedValue(saved.outfit);
    mocks.savedCreate.mockResolvedValue(saved);
    mocks.savedCount.mockResolvedValue(1);
    mocks.savedFindMany.mockResolvedValue([saved]);
    mocks.savedFindFirst.mockResolvedValue(saved);
    mocks.savedUpdate.mockResolvedValue(saved);
    mocks.savedFindUniqueOrThrow.mockResolvedValue(saved);
    mocks.savedDelete.mockResolvedValue(saved);
    mocks.outfitUpdate.mockResolvedValue(saved.outfit);
  });

  it('requires authentication for private saved data', async () => {
    expect((await request(createApp()).get('/outfits/saved')).status).toBe(401);
    expect((await request(createApp()).get('/outfits/saved/saved-a')).status).toBe(401);
  });

  it('saves owned items and their snapshots atomically', async () => {
    const response = await request(createApp()).post('/outfits').set('Cookie', userACookie)
      .send({ title: 'Office look', clothingItemIds: ['item-a', 'item-b'], collection: 'Office' });
    expect(response.status).toBe(201);
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.clothingFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['item-a', 'item-b'] }, userId: 'user-a', archived: false } }));
    expect(mocks.outfitCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      userId: 'user-a', items: { create: [
        expect.objectContaining({ clothingItemId: 'item-a', snapshotName: 'Ivory Top', snapshotCategory: 'tops' }),
        expect.objectContaining({ clothingItemId: 'item-b', snapshotName: 'Black Skirt', snapshotCategory: 'skirts' }),
      ] },
    }) }));
    expect(mocks.savedCreate).toHaveBeenCalledWith({ data: { userId: 'user-a', outfitId: 'outfit-a', collection: 'Office' } });
  });

  it('rejects a foreign clothing item before any outfit is written', async () => {
    mocks.clothingFindMany.mockResolvedValue([{ id: 'item-a', name: 'Ivory Top', category: 'tops' }]);
    const response = await request(createApp()).post('/outfits').set('Cookie', userACookie)
      .send({ title: 'Invalid look', clothingItemIds: ['item-a', 'user-b-item'] });
    expect(response.status).toBe(403);
    expect(mocks.outfitCreate).not.toHaveBeenCalled();
  });

  it('retrieves only the caller’s saved outfits with validated search, filters, and sorting', async () => {
    const response = await request(createApp()).get('/outfits/saved?search=office&collection=Office&favorite=true&sortBy=title&sortDir=asc')
      .set('Cookie', userACookie);
    expect(response.status).toBe(200);
    expect(response.body.data[0].id).toBe('saved-a');
    expect(mocks.savedFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'user-a', collection: 'Office', OR: expect.any(Array) }),
      orderBy: { outfit: { title: 'asc' } },
    }));
    expect((await request(createApp()).get('/outfits/saved?sortBy=invalid').set('Cookie', userACookie)).status).toBe(422);
  });

  it('isolates detail, update, and removal by the authenticated user', async () => {
    mocks.savedFindFirst.mockImplementation(async ({ where }: { where: { userId: string } }) => where.userId === 'user-a' ? saved : null);
    const app = createApp();
    expect((await request(app).get('/outfits/saved/saved-a').set('Cookie', userBCookie)).status).toBe(404);
    expect((await request(app).patch('/outfits/saved/saved-a').set('Cookie', userBCookie).send({ title: 'Stolen' })).status).toBe(404);
    expect((await request(app).delete('/outfits/saved/saved-a').set('Cookie', userBCookie)).status).toBe(404);
    expect(mocks.outfitUpdate).not.toHaveBeenCalled();
    expect(mocks.savedDelete).not.toHaveBeenCalled();

    const detail = await request(app).get('/outfits/saved/saved-a').set('Cookie', userACookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data.outfit.items[0].snapshotName).toBe('Ivory Top');
  });

  it('updates only title, personal notes, and lookbook, and removes an owned save', async () => {
    const app = createApp();
    expect((await request(app).patch('/outfits/saved/saved-a').set('Cookie', userACookie).send({ userId: 'user-b' })).status).toBe(422);
    const response = await request(app).patch('/outfits/saved/saved-a').set('Cookie', userACookie)
      .send({ title: 'New title', notes: 'Wear with boots', collection: 'Weekend' });
    expect(response.status).toBe(200);
    expect(mocks.outfitUpdate).toHaveBeenCalledWith({ where: { id: 'outfit-a' }, data: { title: 'New title' } });
    expect(mocks.savedUpdate).toHaveBeenCalledWith({ where: { id: 'saved-a' }, data: { notes: 'Wear with boots', collection: 'Weekend' } });
    expect((await request(app).delete('/outfits/saved/saved-a').set('Cookie', userACookie)).status).toBe(204);
    expect(mocks.savedDelete).toHaveBeenCalledWith({ where: { id: 'saved-a' } });
  });
});
