import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middleware/errorHandler';
import { signToken } from '../utils/token';

const mocks = vi.hoisted(() => ({
  productFindMany: vi.fn(), productFindFirst: vi.fn(), clothingFindMany: vi.fn(),
  inspirationFindMany: vi.fn(), preferenceFindUnique: vi.fn(), outfitFindMany: vi.fn(),
  recCount: vi.fn(), recFindMany: vi.fn(), recFindUnique: vi.fn(), recUpsert: vi.fn(),
  wishlistFindMany: vi.fn(), wishlistUpsert: vi.fn(), wishlistDeleteMany: vi.fn(),
}));
vi.mock('../config/db', () => ({ prisma: {
  product: { findMany: mocks.productFindMany, findFirst: mocks.productFindFirst },
  clothingItem: { findMany: mocks.clothingFindMany },
  inspirationMatch: { findMany: mocks.inspirationFindMany },
  userPreference: { findUnique: mocks.preferenceFindUnique },
  outfit: { findMany: mocks.outfitFindMany },
  shoppingRecommendation: { count: mocks.recCount, findMany: mocks.recFindMany,
    findUnique: mocks.recFindUnique, upsert: mocks.recUpsert },
  wishlistItem: { findMany: mocks.wishlistFindMany, upsert: mocks.wishlistUpsert,
    deleteMany: mocks.wishlistDeleteMany },
} }));
import shoppingRoutes from './shoppingRoutes';

const productId = 'clx00000000000000000000001';
const product = { id: productId, name: 'Sample loafers', brand: null, category: 'shoes',
  imageUrl: '/shopping-1.svg', attributes: { colors: ['Ivory'], aesthetics: ['Minimal'], occasions: ['Office'] },
  isSample: true, isActive: true, offers: [] };
const recommendations = new Map<string, { id: string; userId: string; productId: string;
  title: string; reason: string; similarity: number; signals: string[] }>();
const saved = new Set<string>();
const wishlistRowId = 'clx00000000000000000000002';
let productRemoved = false;

function cookie(userId: string) {
  return `closetai_access=${signToken({ id: userId, email: `${userId}@example.com`, name: userId, role: 'user' })}`;
}
function app() {
  const server = express();
  server.use(express.json()); server.use(cookieParser());
  server.use('/shopping', shoppingRoutes); server.use(errorHandler);
  return server;
}
function recommendation(userId: string) { return recommendations.get(userId); }
function present(userId: string) {
  const rec = recommendation(userId);
  return rec && { ...rec, product: productRemoved ? null : { ...product },
    wishlistItems: saved.has(userId) ? [{ id: wishlistRowId }] : [] };
}

describe('shopping catalog and wishlist API', () => {
  beforeEach(() => {
    vi.clearAllMocks(); recommendations.clear(); saved.clear(); product.isActive = true; productRemoved = false;
    mocks.productFindMany.mockImplementation(async () => product.isActive ? [product] : []);
    mocks.productFindFirst.mockImplementation(async ({ where }: { where: { id: string; isActive: boolean } }) =>
      where.id === product.id && product.isActive && !productRemoved ? { ...product } : null);
    mocks.clothingFindMany.mockImplementation(async ({ where }: { where: { userId: string } }) =>
      where.userId === 'user-a' ? [{ category: 'tops', colors: ['Ivory'] }] : []);
    mocks.inspirationFindMany.mockResolvedValue([]);
    mocks.preferenceFindUnique.mockResolvedValue({ preferredAesthetics: ['Minimal'], favoriteColors: ['Ivory'] });
    mocks.outfitFindMany.mockResolvedValue([{ occasion: 'Office' }]);
    mocks.recCount.mockImplementation(async ({ where }: { where: { userId: string } }) => recommendation(where.userId) ? 1 : 0);
    mocks.recUpsert.mockImplementation(async ({ where, create, update }: { where: { userId_productId: { userId: string } };
      create: typeof recommendations extends Map<string, infer T> ? T : never; update: object }) => {
      const userId = where.userId_productId.userId;
      const row = { ...create, ...update, id: `rec-${userId}` };
      recommendations.set(userId, row); return row;
    });
    mocks.recFindUnique.mockImplementation(async ({ where }: { where: { userId_productId: { userId: string } } }) =>
      recommendation(where.userId_productId.userId) ?? null);
    mocks.recFindMany.mockImplementation(async ({ where }: { where: { userId: string } }) =>
      product.isActive && present(where.userId) ? [present(where.userId)] : []);
    mocks.wishlistUpsert.mockImplementation(async ({ where }: { where: { userId_shoppingRecommendationId: { userId: string } } }) => {
      saved.add(where.userId_shoppingRecommendationId.userId); return { id: 'wishlisted' };
    });
    mocks.wishlistDeleteMany.mockImplementation(async ({ where }: { where: { userId: string } }) => {
      saved.delete(where.userId); return { count: 1 };
    });
    mocks.wishlistFindMany.mockImplementation(async ({ where }: { where: { userId: string } }) =>
      saved.has(where.userId) ? [{ id: wishlistRowId, createdAt: new Date(),
        recommendation: present(where.userId) }] : []);
  });

  it('requires authentication, validates filters, and rejects cross-origin writes', async () => {
    expect((await request(app()).get('/shopping')).status).toBe(401);
    expect((await request(app()).get('/shopping?page=0').set('Cookie', cookie('user-a'))).status).toBe(422);
    expect((await request(app()).post('/shopping/refresh').set('Cookie', cookie('user-a'))
      .set('Origin', 'https://untrusted.example')).status).toBe(403);
  });

  it('persists a wishlist across reads, prevents cross-user access, and removes only own entry', async () => {
    const server = app();
    const first = await request(server).get('/shopping').set('Cookie', cookie('user-a'));
    expect(first.status).toBe(200);
    // In NODE_ENV=test, only an actual catalog product is eligible; the mock
    // returns a sample deliberately so presentation behavior is also exercised.
    expect(mocks.productFindMany.mock.calls[0]?.[0].where.isSample).toBe(false);
    expect(first.body.data[0].reason).toMatch(/style preferences/);
    expect(first.body.data[0].price).toBeNull();
    expect(first.body.data[0].isSample).toBe(true);
    expect((await request(server).post('/shopping/wishlist').set('Cookie', cookie('user-a'))
      .send({ catalogItemId: productId })).status).toBe(201);
    expect((await request(server).get('/shopping/wishlist').set('Cookie', cookie('user-a'))).body.data).toHaveLength(1);
    expect((await request(server).get('/shopping/wishlist').set('Cookie', cookie('user-b'))).body.data).toHaveLength(0);
    expect((await request(server).delete('/shopping/wishlist').set('Cookie', cookie('user-b'))
      .send({ catalogItemId: productId })).status).toBe(204);
    expect((await request(server).get('/shopping/wishlist').set('Cookie', cookie('user-a'))).body.data).toHaveLength(1);
    expect((await request(server).delete('/shopping/wishlist').set('Cookie', cookie('user-a'))
      .send({ catalogItemId: productId })).status).toBe(204);
    expect((await request(server).get('/shopping/wishlist').set('Cookie', cookie('user-a'))).body.data).toHaveLength(0);
  });

  it('rejects unavailable products and never presents a buy link for a sample', async () => {
    const server = app();
    const compare = await request(server).get(`/shopping/compare/${productId}`).set('Cookie', cookie('user-a'));
    expect(compare.body.data.comparisons).toEqual([]);
    product.isActive = false;
    expect((await request(server).post('/shopping/wishlist').set('Cookie', cookie('user-a'))
      .send({ catalogItemId: productId })).status).toBe(404);
    expect((await request(server).get(`/shopping/compare/${productId}`).set('Cookie', cookie('user-a'))).status).toBe(404);
  });

  it('returns real product details with an explicit empty-offer state and no live refresh for samples', async () => {
    const server = app();
    expect((await request(server).get(`/shopping/products/${productId}`)).status).toBe(401);
    const detail = await request(server).get(`/shopping/products/${productId}`).set('Cookie', cookie('user-a'));
    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({ id: productId, name: 'Sample loafers',
      isSample: true, offers: [], canRefresh: false });
    expect((await request(server).get('/shopping/products/not-an-id').set('Cookie', cookie('user-a'))).status).toBe(422);
    expect((await request(server).post(`/shopping/products/${productId}/refresh`)
      .set('Cookie', cookie('user-a'))).status).toBe(503);
  });

  it('rate-limits repeated provider refresh attempts per authenticated user', async () => {
    const server = app();
    const statuses = [];
    for (let index = 0; index < 5; index += 1) {
      const response = await request(server).post(`/shopping/products/${productId}/refresh`)
        .set('Cookie', cookie('rate-limit-user'));
      statuses.push(response.status);
    }
    expect(statuses).toEqual([503, 503, 503, 503, 429]);
  });

  it('recomputes and persists relevance after wardrobe changes', async () => {
    const server = app();
    const before = await request(server).get('/shopping').set('Cookie', cookie('user-a'));
    expect(before.body.data[0].reason).toMatch(/Adds a shoes category/);
    mocks.clothingFindMany.mockResolvedValue([{ category: 'shoes', colors: ['Ivory'] }]);
    const refreshed = await request(server).post('/shopping/refresh').set('Cookie', cookie('user-a'));
    expect(refreshed.status).toBe(200);
    const after = await request(server).get('/shopping').set('Cookie', cookie('user-a'));
    expect(after.body.data[0].reason).not.toMatch(/Adds a shoes category/);
    expect(mocks.recUpsert).toHaveBeenCalledTimes(2);
  });

  it('keeps a removed product as an unavailable, removable wishlist snapshot', async () => {
    const server = app();
    await request(server).post('/shopping/wishlist').set('Cookie', cookie('user-a'))
      .send({ catalogItemId: productId });
    productRemoved = true;
    const savedList = await request(server).get('/shopping/wishlist').set('Cookie', cookie('user-a'));
    expect(savedList.body.data[0].item.available).toBe(false);
    expect(savedList.body.data[0].item.url).toBeNull();
    expect((await request(server).delete('/shopping/wishlist').set('Cookie', cookie('user-b'))
      .send({ wishlistItemId: wishlistRowId })).status).toBe(204);
    expect((await request(server).get('/shopping/wishlist').set('Cookie', cookie('user-a'))).body.data).toHaveLength(1);
    expect((await request(server).delete('/shopping/wishlist').set('Cookie', cookie('user-a'))
      .send({ wishlistItemId: wishlistRowId })).status).toBe(204);
    expect((await request(server).get('/shopping/wishlist').set('Cookie', cookie('user-a'))).body.data).toHaveLength(0);
  });
});
