import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../utils/AppError';
import { errorHandler } from '../middleware/errorHandler';
import { signToken } from '../utils/token';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), clothingFindMany: vi.fn(), inspirationCreate: vi.fn(), historyCreate: vi.fn(),
  inspirationFindFirst: vi.fn(), inspirationFindMany: vi.fn(), inspirationCount: vi.fn(), inspirationDelete: vi.fn(),
  prepare: vi.fn(), store: vi.fn(), read: vi.fn(), cleanup: vi.fn(), signedUrl: vi.fn(), analyze: vi.fn(),
}));
vi.mock('../config/db', () => ({ prisma: {
  $transaction: mocks.transaction,
  clothingItem: { findMany: mocks.clothingFindMany },
  inspirationImage: { findFirst: mocks.inspirationFindFirst, findMany: mocks.inspirationFindMany,
    count: mocks.inspirationCount, delete: mocks.inspirationDelete },
} }));
vi.mock('../services/inspirationStorage', () => ({
  prepareInspirationImage: mocks.prepare,
  storeInspirationImage: mocks.store,
  readLocalInspirationImage: mocks.read,
  deleteStoredInspirationImage: mocks.cleanup,
  cloudinaryInspirationDownloadUrl: mocks.signedUrl,
}));
vi.mock('../services/ai/index', () => ({ getAIProvider: () => ({ name: 'test-vision', model: 'test-v1', analyzeInspirationImage: mocks.analyze }) }));
import pinterestRoutes from './pinterestRoutes';

const userACookie = `closetai_access=${signToken({ id: 'user-a', email: 'a@example.com', name: 'A', role: 'user' })}`;
const userBCookie = `closetai_access=${signToken({ id: 'user-b', email: 'b@example.com', name: 'B', role: 'user' })}`;
const attributes = {
  detectedStyle: 'Minimal', colors: ['Ivory'], patterns: [], aesthetics: ['Minimal'], silhouettes: [], layers: [], accessories: [],
  garments: [{ category: 'tops', description: 'Ivory top', colors: ['Ivory'] }],
};
const ownedItem = { id: 'item-a', name: 'Ivory Top', category: 'tops', colors: ['Ivory'], pattern: null,
  silhouette: null, fit: null, aesthetics: ['Minimal'] };
let savedRecord: Record<string, unknown> | null;

const tx = {
  clothingItem: { findMany: mocks.clothingFindMany },
  inspirationImage: { create: mocks.inspirationCreate },
  aIStylingHistory: { create: mocks.historyCreate },
};

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/inspiration', pinterestRoutes);
  app.use(errorHandler);
  return app;
}

function imageUpload(app: ReturnType<typeof createApp>, cookie = userACookie) {
  return request(app).post('/inspiration/analyze').set('Cookie', cookie)
    .attach('image', Buffer.from('test-image'), { filename: 'inspiration.png', contentType: 'image/png' });
}

describe('private inspiration API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savedRecord = null;
    mocks.prepare.mockResolvedValue({ bytes: Buffer.from('normalized'), contentType: 'image/webp', byteSize: 10,
      width: 64, height: 64, imageHash: 'a'.repeat(64) });
    mocks.store.mockResolvedValue({ storageProvider: 'local', storageKey: 'a'.repeat(48) + '.webp', imageProviderId: 'key' });
    mocks.read.mockResolvedValue(Buffer.from('stored-webp'));
    mocks.cleanup.mockResolvedValue(undefined);
    mocks.analyze.mockResolvedValue(attributes);
    mocks.clothingFindMany.mockImplementation(async ({ where }: { where: { userId: string; id?: { in: string[] } } }) =>
      where.userId === 'user-a' && (!where.id || where.id.in.includes('item-a')) ? [ownedItem] : []);
    mocks.transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
    mocks.inspirationCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      const nested = data.matches as { create: Record<string, unknown> };
      savedRecord = { ...data, matches: [{ ...nested.create, id: 'match-a', createdAt: new Date() }], createdAt: new Date() };
      return savedRecord;
    });
    mocks.historyCreate.mockResolvedValue({ id: 'history-a' });
    mocks.inspirationFindFirst.mockImplementation(async ({ where }: { where: { id: string; userId: string } }) =>
      savedRecord?.id === where.id && savedRecord?.userId === where.userId ? savedRecord : null);
    mocks.inspirationFindMany.mockImplementation(async ({ where }: { where: { userId: string } }) =>
      savedRecord?.userId === where.userId ? [savedRecord] : []);
    mocks.inspirationCount.mockImplementation(async ({ where }: { where: { userId: string } }) =>
      savedRecord?.userId === where.userId ? 1 : 0);
    mocks.inspirationDelete.mockImplementation(async () => { savedRecord = null; return {}; });
  });

  it('requires authentication and does not fetch arbitrary Pinterest URLs', async () => {
    const app = createApp();
    expect((await request(app).get('/inspiration')).status).toBe(401);
    expect((await imageUpload(app, '')).status).toBe(401);
    const urlAttempt = await request(app).post('/inspiration/analyze').set('Cookie', userACookie)
      .send({ imageUrl: 'https://www.pinterest.com/example' });
    expect(urlAttempt.status).toBe(422);
    expect(mocks.analyze).not.toHaveBeenCalled();
  });

  it('uploads, analyses attributes, matches owned items, and persists a revisit-able record', async () => {
    const app = createApp();
    const uploaded = await imageUpload(app);
    expect(uploaded.status).toBe(201);
    const id = uploaded.body.data.id as string;
    expect(uploaded.body.data.analysis.matchedItems[0]).toMatchObject({ clothingItemId: 'item-a', available: true });
    expect(uploaded.body.data.analysis.matchingMethod).toBe('attribute-v1');
    expect(mocks.analyze).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/webp;base64,/));
    expect(mocks.store).toHaveBeenCalledOnce();
    expect(mocks.transaction).toHaveBeenCalledOnce();
    expect(mocks.clothingFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-a', archived: false } }));

    const list = await request(app).get('/inspiration?page=1').set('Cookie', userACookie);
    expect(list.status).toBe(200);
    expect(list.body.data[0].id).toBe(id);
    const detail = await request(app).get(`/inspiration/${id}`).set('Cookie', userACookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data.analysis.matchedItems[0].item.name).toBe('Ivory Top');
    const image = await request(app).get(`/inspiration/${id}/image`).set('Cookie', userACookie);
    expect(image.status).toBe(200);
    expect(image.headers['cache-control']).toBe('private, no-store');
  });

  it('rejects invalid uploads and provider failures without storing an asset', async () => {
    const app = createApp();
    expect((await request(app).post('/inspiration/analyze').set('Cookie', userACookie)
      .attach('image', Buffer.from('bad'), { filename: 'bad.txt', contentType: 'text/plain' })).status).toBe(422);
    mocks.prepare.mockRejectedValueOnce(new AppError('Invalid image.', 422));
    expect((await imageUpload(app)).status).toBe(422);
    mocks.analyze.mockRejectedValueOnce(new AppError('AI unavailable.', 503));
    expect((await imageUpload(app)).status).toBe(503);
    mocks.analyze.mockResolvedValueOnce({ ...attributes, clothingItemId: 'foreign-item' });
    expect((await imageUpload(app)).status).toBe(502);
    expect(mocks.store).not.toHaveBeenCalled();
  });

  it('cleans the uploaded asset if persistence fails', async () => {
    mocks.transaction.mockRejectedValueOnce(new Error('database failure'));
    expect((await imageUpload(createApp())).status).toBe(500);
    expect(mocks.cleanup).toHaveBeenCalledOnce();
  });

  it('isolates saved details, images, and deletion from another user', async () => {
    const app = createApp();
    const created = await imageUpload(app);
    const id = created.body.data.id as string;
    expect((await request(app).get(`/inspiration/${id}`).set('Cookie', userBCookie)).status).toBe(404);
    expect((await request(app).get(`/inspiration/${id}/image`).set('Cookie', userBCookie)).status).toBe(404);
    expect((await request(app).delete(`/inspiration/${id}`).set('Cookie', userBCookie)).status).toBe(404);
    expect(mocks.cleanup).not.toHaveBeenCalled();
    expect((await request(app).delete(`/inspiration/${id}`).set('Cookie', userACookie)).status).toBe(204);
    expect(mocks.cleanup).toHaveBeenCalledOnce();
    expect((await request(app).get(`/inspiration/${id}`).set('Cookie', userACookie)).status).toBe(404);
  });

  it('marks a formerly matched item unavailable after wardrobe deletion', async () => {
    const app = createApp();
    const created = await imageUpload(app);
    const id = created.body.data.id as string;
    mocks.clothingFindMany.mockResolvedValue([]);
    const detail = await request(app).get(`/inspiration/${id}`).set('Cookie', userACookie);
    expect(detail.status).toBe(200);
    expect(detail.body.data.analysis.matchedItems[0]).toMatchObject({ item: null, available: false });
    expect(detail.body.data.analysis.recreationSuggestion.clothingItemIds).toEqual([]);
    expect(detail.body.data.analysis.recreationSuggestion.overallScore).toBe(0);
    expect(detail.body.data.analysis.missingPieces[0].reason).toMatch(/no longer available/);
  });
});
