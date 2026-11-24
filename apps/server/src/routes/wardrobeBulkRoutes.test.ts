import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middleware/errorHandler';
import { signToken } from '../utils/token';

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), updateMany: vi.fn() }));
vi.mock('../config/db', () => ({ prisma: { $transaction: mocks.transaction } }));
import wardrobeRoutes from './wardrobeRoutes';

function app() {
  const server = express(); server.use(express.json()); server.use(cookieParser());
  server.use('/wardrobe', wardrobeRoutes); server.use(errorHandler); return server;
}
const cookie = `closetai_access=${signToken({ id: 'user-a', email: 'a@example.test', name: 'A', role: 'user' })}`;

describe('wardrobe bulk actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({ clothingItem: { updateMany: mocks.updateMany } }));
    mocks.updateMany.mockResolvedValue({ count: 2 });
  });

  it.each([
    ['favorite', { favorite: true }], ['unfavorite', { favorite: false }],
    ['archive', { archived: true }], ['restore', { archived: false }],
  ])('applies %s only to authenticated user records', async (action, data) => {
    const result = await request(app()).patch('/wardrobe/bulk').set('Cookie', cookie).send({ itemIds: ['one', 'two'], action });
    expect(result.status).toBe(200);
    expect(result.body.data.updatedCount).toBe(2);
    expect(mocks.updateMany).toHaveBeenCalledWith({ where: { id: { in: ['one', 'two'] }, userId: 'user-a' }, data });
  });

  it('rejects missing authentication and untrusted browser origins before writing', async () => {
    expect((await request(app()).patch('/wardrobe/bulk').send({ itemIds: ['one'], action: 'archive' })).status).toBe(401);
    expect((await request(app()).patch('/wardrobe/bulk').set('Cookie', cookie).set('Origin', 'https://attacker.example')
      .send({ itemIds: ['one'], action: 'archive' })).status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each([
    { itemIds: [], action: 'archive' }, { itemIds: ['one', 'one'], action: 'archive' },
    { itemIds: Array.from({ length: 101 }, (_, i) => String(i)), action: 'archive' },
    { itemIds: ['one'], action: 'delete' }, { itemIds: ['one'], action: 'archive', userId: 'other' },
  ])('rejects invalid batches and mass assignment', async (body) => {
    expect((await request(app()).patch('/wardrobe/bulk').set('Cookie', cookie).send(body)).status).toBe(422);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('aborts the transaction when an ID is missing or belongs to someone else', async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    const result = await request(app()).patch('/wardrobe/bulk').set('Cookie', cookie)
      .send({ itemIds: ['one', 'foreign-or-deleted'], action: 'archive' });
    expect(result.status).toBe(404);
    expect(result.body.code).toBe('BULK_ITEMS_UNAVAILABLE');
    await expect(mocks.transaction.mock.results[0].value).rejects.toMatchObject({ code: 'BULK_ITEMS_UNAVAILABLE' });
  });
});
