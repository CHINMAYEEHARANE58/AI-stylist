import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middleware/errorHandler';
import { signToken } from '../utils/token';

const mocks = vi.hoisted(() => ({
  prefs: new Map<string, Record<string, unknown>>(),
  userFindUnique: vi.fn(), upsert: vi.fn(), count: vi.fn(),
}));
vi.mock('../config/db', () => ({ prisma: {
  user: { findUnique: mocks.userFindUnique }, userPreference: { upsert: mocks.upsert },
  clothingItem: { count: mocks.count }, savedOutfit: { count: mocks.count }, aIStylingHistory: { count: mocks.count },
} }));
import profileRoutes from './profileRoutes';

const cookie = (id: string) => `closetai_access=${signToken({ id, email: `${id}@example.com`, name: id, role: 'user' })}`;
function app() {
  const server = express(); server.use(express.json()); server.use(cookieParser());
  server.use('/profile', profileRoutes); server.use(errorHandler); return server;
}

describe('persistent style preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.prefs.clear(); mocks.count.mockResolvedValue(0);
    mocks.upsert.mockImplementation(async ({ where, create, update }: { where: { userId: string };
      create: Record<string, unknown>; update: Record<string, unknown> }) => {
      const row = { ...(mocks.prefs.get(where.userId) ?? create), ...update, userId: where.userId };
      mocks.prefs.set(where.userId, row); return row;
    });
    mocks.userFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({
      id: where.id, email: `${where.id}@example.com`, role: 'USER', emailVerifiedAt: new Date(),
      profile: { firstName: where.id }, preferences: mocks.prefs.get(where.id) ?? null,
    }));
  });

  it('persists edits across reads and keeps each user isolated', async () => {
    const server = app();
    const update = await request(server).patch('/profile/preferences').set('Cookie', cookie('user-a'))
      .send({ preferredAesthetics: ['Minimal'], favoriteColors: ['Ivory'],
        preferredCategories: ['tops'], preferredOccasions: ['Office'],
        fitPreferences: ['Relaxed'], preferredSeasons: ['Summer'], styleDislikes: ['neon'],
        budgetCurrency: 'USD', budgetMax: 100, weatherCity: 'Pune' });
    expect(update.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-a' } }));
    expect((await request(server).get('/profile').set('Cookie', cookie('user-a'))).body.data.preferences)
      .toMatchObject({ favoriteColors: ['Ivory'], weatherCity: 'Pune', budgetCurrency: 'USD' });
    expect((await request(server).get('/profile').set('Cookie', cookie('user-b'))).body.data.preferences).toBeNull();
  });

  it('rejects unknown owner fields, duplicate tags, invalid budget, and missing auth', async () => {
    const server = app();
    expect((await request(server).patch('/profile/preferences').send({ favoriteColors: ['Ivory'] })).status).toBe(401);
    for (const body of [{ userId: 'user-b', favoriteColors: ['Ivory'] },
      { favoriteColors: ['Ivory', 'ivory'] }, { budgetCurrency: 'FAKE', budgetMax: 20 },
      { budgetCurrency: 'USD' }, { budgetCurrency: 'USD', budgetMax: 20.001 }]) {
      expect((await request(server).patch('/profile/preferences').set('Cookie', cookie('user-a')).send(body)).status).toBe(422);
    }
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it('resets style fields without deleting unrelated account settings', async () => {
    const server = app();
    mocks.prefs.set('user-a', { preferredAesthetics: ['Minimal'], favoriteColors: ['Blue'],
      notificationPreferences: { daily: true }, appearance: 'dark' });
    const response = await request(server).delete('/profile/preferences').set('Cookie', cookie('user-a'));
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ preferredAesthetics: [], favoriteColors: [],
      notificationPreferences: { daily: true }, appearance: 'dark' });
    expect(mocks.prefs.has('user-b')).toBe(false);
  });
});
