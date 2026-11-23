import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middleware/errorHandler';
import { signToken } from '../utils/token';
import { outfitGenerationLimiter } from '../middleware/rateLimiter';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findMany: vi.fn(),
  historyCreate: vi.fn(),
  styleThisItem: vi.fn(),
  generateOutfits: vi.fn(), preferenceFindUnique: vi.fn(), eventFindFirst: vi.fn(), weatherGet: vi.fn(),
}));
vi.mock('../config/db', () => ({ prisma: {
  clothingItem: { findFirst: mocks.findFirst, findMany: mocks.findMany },
  aIStylingHistory: { create: mocks.historyCreate },
  userPreference: { findUnique: mocks.preferenceFindUnique },
  calendarEvent: { findFirst: mocks.eventFindFirst },
} }));
vi.mock('../services/ai/index', () => ({ getAIProvider: () => ({ styleThisItem: mocks.styleThisItem,
  generateOutfits: mocks.generateOutfits }) }));
vi.mock('../services/weatherService', () => ({ getWeatherStylingContext: mocks.weatherGet }));

import outfitRoutes from './outfitRoutes';

const anchor = { id: 'anchor-a', name: 'Ivory Top', category: 'tops', colors: ['Ivory'], seasons: ['Summer'], occasions: ['Office'], aesthetics: ['Minimal'], pattern: null, material: null };
const companion = { ...anchor, id: 'companion-a', name: 'Black Trousers', category: 'trousers', colors: ['Black'] };
const validLook = { aesthetic: 'Minimal', clothingItemIds: ['anchor-a', 'companion-a'], explanation: 'The dark trousers balance the light anchor top.', occasion: 'Office' };
const cookie = `closetai_access=${signToken({ id: 'user-a', email: 'a@example.com', name: 'User A', role: 'user' })}`;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/outfits', outfitRoutes);
  app.use(errorHandler);
  return app;
}

describe('style this item route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    outfitGenerationLimiter.resetKey('::ffff:127.0.0.1');
    mocks.findFirst.mockResolvedValue(anchor);
    mocks.findMany.mockResolvedValueOnce([companion]).mockResolvedValueOnce([anchor, companion]);
    mocks.styleThisItem.mockResolvedValue({ looks: [validLook], provider: 'test', model: 'test-model' });
    mocks.historyCreate.mockResolvedValue({ id: 'history-a' });
  });

  it('requires authentication and verifies anchor ownership before calling AI', async () => {
    expect((await request(createApp()).post('/outfits/style-item').send({ itemId: 'anchor-a' })).status).toBe(401);
    mocks.findFirst.mockResolvedValue(null);
    const response = await request(createApp()).post('/outfits/style-item').set('Cookie', cookie).send({ itemId: 'user-b-item' });
    expect(response.status).toBe(404);
    expect(mocks.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'user-b-item', userId: 'user-a', archived: false } }));
    expect(mocks.styleThisItem).not.toHaveBeenCalled();
  });

  it('returns a helpful empty state without calling AI when no companion matches', async () => {
    mocks.findMany.mockReset().mockResolvedValue([]);
    const response = await request(createApp()).post('/outfits/style-item').set('Cookie', cookie)
      .send({ itemId: 'anchor-a', occasion: 'Party' });
    expect(response.status).toBe(200);
    expect(response.body.data.looks).toEqual([]);
    expect(mocks.styleThisItem).not.toHaveBeenCalled();
  });

  it('generates owned looks with the requested filters and persists only validated history', async () => {
    const response = await request(createApp()).post('/outfits/style-item').set('Cookie', cookie)
      .send({ itemId: 'anchor-a', aesthetics: ['Minimal'], occasion: 'Office', season: 'Summer' });
    expect(response.status).toBe(200);
    expect(response.body.data.looks[0].clothingItemIds).toEqual(['anchor-a', 'companion-a']);
    expect(mocks.styleThisItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'anchor-a' }),
      expect.arrayContaining([expect.objectContaining({ id: 'companion-a' })]),
      expect.objectContaining({ occasion: 'Office', season: 'Summer', aesthetics: ['Minimal'] }));
    expect(mocks.historyCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      userId: 'user-a', requestType: 'style_item', output: { itemId: 'anchor-a', looks: [validLook] },
    }) }));
  });

  it.each([
    ['foreign or hallucinated', ['anchor-a', 'user-b-item']],
    ['deleted during generation', ['anchor-a', 'companion-a']],
  ])('rejects %s item IDs and never persists an invalid look', async (_label, ids) => {
    mocks.styleThisItem.mockResolvedValue({ looks: [{ ...validLook, clothingItemIds: ids }], provider: 'test', model: 'test-model' });
    if (_label === 'deleted during generation') mocks.findMany.mockReset().mockResolvedValueOnce([companion]).mockResolvedValueOnce([anchor]);
    const response = await request(createApp()).post('/outfits/style-item').set('Cookie', cookie).send({ itemId: 'anchor-a' });
    expect(response.status).toBe(502);
    expect(response.body.code).toBe('AI_INVALID_ITEM_IDS');
    expect(mocks.historyCreate).not.toHaveBeenCalled();
  });

  it('rejects malformed provider output, including duplicate anchor IDs', async () => {
    mocks.styleThisItem.mockResolvedValue({ looks: [{ ...validLook, clothingItemIds: ['anchor-a', 'anchor-a'] }], provider: 'test', model: 'test-model' });
    const response = await request(createApp()).post('/outfits/style-item').set('Cookie', cookie).send({ itemId: 'anchor-a' });
    expect(response.status).toBe(502);
    expect(response.body.code).toBe('AI_MALFORMED_STYLE_RESPONSE');
  });
});

describe('outfit generation preference and event integration', () => {
  const eventId = 'clx00000000000000000000001';
  beforeEach(() => {
    vi.clearAllMocks();
    outfitGenerationLimiter.resetKey('::ffff:127.0.0.1');
    mocks.findMany.mockResolvedValueOnce([anchor, companion]).mockResolvedValueOnce([anchor, companion]);
    mocks.preferenceFindUnique.mockResolvedValue({ preferredAesthetics: ['Minimal'], favoriteColors: ['Ivory'],
      preferredCategories: ['tops'], preferredOccasions: ['Office'], fitPreferences: ['Relaxed'],
      preferredSeasons: ['Summer'], styleDislikes: ['Neon'], weatherCity: 'Pune' });
    mocks.eventFindFirst.mockResolvedValue({ id: eventId, title: 'Presentation', eventType: 'Office',
      startsAt: new Date('2030-07-01T03:30:00Z'), timeZone: 'Asia/Kolkata' });
    mocks.weatherGet.mockResolvedValue({ available: true, city: 'Pune, India', temperatureC: 24,
      precipitationMm: 3, condition: 'Rain', stylingTip: 'Choose a light layer.',
      retrievedAt: '2030-06-30T12:00:00Z', source: 'Open-Meteo' });
    mocks.generateOutfits.mockResolvedValue({ provider: 'test', model: 'test-model', outfits: [{
      title: 'Office look', clothingItemIds: ['anchor-a', 'companion-a'],
      occasion: 'Office', aesthetic: 'Minimal', explanation: 'Two complementary pieces.', score: 85,
    }] });
    mocks.historyCreate.mockResolvedValue({ id: 'history-a' });
  });

  it('passes saved style and selected-city weather to AI while returning owned item IDs', async () => {
    const response = await request(createApp()).post('/outfits/generate').set('Cookie', cookie)
      .send({ eventId, useWeather: true });
    expect(response.status).toBe(200);
    expect(response.body.data.outfits[0].clothingItemIds).toEqual(['anchor-a', 'companion-a']);
    expect(response.body.data.weather).toMatchObject({ available: true, source: 'Open-Meteo' });
    expect(mocks.eventFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: eventId, userId: 'user-a' } }));
    expect(mocks.weatherGet).toHaveBeenCalledWith('Pune', expect.any(Date), 'Asia/Kolkata');
    expect(mocks.generateOutfits).toHaveBeenCalledWith(expect.objectContaining({
      occasion: 'Office', weather: expect.stringContaining('24°C'),
      userProfile: expect.objectContaining({ preferredCategories: ['tops'], preferredOccasions: ['Office'],
        fitPreferences: ['Relaxed'], styleDislikes: ['Neon'] }),
    }));
  });

  it('rejects a foreign or past event before the provider sees the wardrobe', async () => {
    mocks.eventFindFirst.mockResolvedValueOnce(null);
    expect((await request(createApp()).post('/outfits/generate').set('Cookie', cookie)
      .send({ eventId })).status).toBe(404);
    mocks.eventFindFirst.mockResolvedValueOnce({ id: eventId, startsAt: new Date('2020-01-01'), timeZone: 'UTC' });
    expect((await request(createApp()).post('/outfits/generate').set('Cookie', cookie)
      .send({ eventId })).status).toBe(422);
    expect(mocks.generateOutfits).not.toHaveBeenCalled();
  });

  it('keeps complementary colours and styles when generating around a bag', async () => {
    const bag = { ...anchor, id: 'bag', name: 'Blue and white bag', category: 'accessories', colors: ['Blue', 'White'], occasions: ['Casual'], aesthetics: ['Romantic'] };
    const jeans = { ...companion, id: 'jeans', colors: ['Blue'], occasions: ['Casual'], aesthetics: ['Classic'] };
    const top = { ...anchor, id: 'top', colors: ['Ivory'], occasions: ['Casual'], aesthetics: ['Romantic'] };
    mocks.findMany.mockReset().mockResolvedValueOnce([jeans, top, bag]).mockResolvedValueOnce([jeans, top, bag]);
    mocks.generateOutfits.mockResolvedValue({ provider: 'test', model: 'test-model', outfits: [{
      title: 'Relaxed summer', clothingItemIds: ['bag', 'top', 'jeans'], occasion: 'Casual',
      aesthetic: 'Relaxed', explanation: 'A light top balances blue denim and the white accents in the bag.', score: 88,
    }] });
    const response = await request(createApp()).post('/outfits/generate').set('Cookie', cookie)
      .send({ anchorItemId: 'bag', colorPreference: 'White', aesthetic: 'Relaxed', mood: 'Relaxed', season: 'Summer', occasion: 'Casual' });
    expect(response.status).toBe(200);
    expect(response.body.data.outfits).toHaveLength(1);
    const input = mocks.generateOutfits.mock.calls[0][0];
    expect(input.wardrobeItems.map((item: { id: string }) => item.id)).toEqual(['bag', 'jeans', 'top']);
    expect(input).toMatchObject({ anchorItemId: 'bag', colorPreference: 'White', aesthetic: 'Relaxed' });
  });

  it('treats All season as unrestricted and retains archived/ownership checks in the database query', async () => {
    const response = await request(createApp()).post('/outfits/generate').set('Cookie', cookie)
      .send({ season: 'All season', colorPreference: 'White', aesthetic: 'Relaxed' });
    expect(response.body.data.outfits).toHaveLength(1);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-a', archived: false } }));
  });

  it('still excludes a different season and saved dislikes before sending records to AI', async () => {
    mocks.findMany.mockReset().mockResolvedValue([{ ...anchor, seasons: ['Winter'] }, { ...companion, colors: ['Neon'] }]);
    const response = await request(createApp()).post('/outfits/generate').set('Cookie', cookie).send({ season: 'Summer' });
    expect(response.body.data.outfits).toEqual([]);
    expect(mocks.generateOutfits).not.toHaveBeenCalled();
  });

  it('does not return a look that omits the selected anchor', async () => {
    mocks.generateOutfits.mockResolvedValue({ provider: 'test', model: 'test-model', outfits: [{
      title: 'Missing anchor', clothingItemIds: ['companion-a'], occasion: 'Office', aesthetic: 'Minimal', explanation: 'Incomplete.', score: 50,
    }] });
    const response = await request(createApp()).post('/outfits/generate').set('Cookie', cookie).send({ anchorItemId: 'anchor-a' });
    expect(response.status).toBe(200);
    expect(response.body.data.outfits).toEqual([]);
  });
});
