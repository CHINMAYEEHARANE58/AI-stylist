import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../utils/AppError';
import { errorHandler } from '../middleware/errorHandler';
import { signToken } from '../utils/token';

const mocks = vi.hoisted(() => ({
  conversationFindFirst: vi.fn(), conversationFindMany: vi.fn(), conversationCreate: vi.fn(),
  conversationUpdate: vi.fn(), conversationDeleteMany: vi.fn(), historyCount: vi.fn(), historyCreate: vi.fn(),
  messageCreateMany: vi.fn(), clothingFindMany: vi.fn(), preferencesFindUnique: vi.fn(),
  transaction: vi.fn(), providerChat: vi.fn(), providerFactory: vi.fn(),
}));
vi.mock('../config/db', () => ({ prisma: {
  stylistConversation: { findFirst: mocks.conversationFindFirst, findMany: mocks.conversationFindMany,
    deleteMany: mocks.conversationDeleteMany },
  aIStylingHistory: { count: mocks.historyCount },
  clothingItem: { findMany: mocks.clothingFindMany },
  userPreference: { findUnique: mocks.preferencesFindUnique },
  $transaction: mocks.transaction,
} }));
vi.mock('../services/ai/index', () => ({ getAIProvider: mocks.providerFactory }));
import stylistRoutes from './stylistRoutes';

const conversationId = 'cstylistconversation123456789';
const ownedTop = { id: 'owned-top', name: 'Ivory blouse', category: 'tops', colors: ['Ivory'],
  seasons: ['Summer'], occasions: ['Office'], aesthetics: ['Minimal'], pattern: null, material: null,
  imageUrl: '/top.png', updatedAt: new Date() };
const ownedPants = { ...ownedTop, id: 'owned-pants', name: 'Black trousers', category: 'bottoms', colors: ['Black'] };
const result = { reply: 'Pair your blouse with trousers.', outfits: [{ title: 'Office',
  clothingItemIds: ['owned-top', 'owned-pants'], explanation: 'Balanced colors.' }],
  shoppingSuggestions: [{ name: 'Loafers', reason: 'Optional finishing piece.' }],
  suggestions: ['What about evening?'], provider: 'test-ai', model: 'test-model' };
type StoredMessage = { id: string; role: 'USER' | 'ASSISTANT'; content: string; result?: unknown;
  provider?: string | null; model?: string | null; createdAt: Date };
let storedMessages: StoredMessage[];
let storedOwner: string | null;
let requestUser: string;
let dropReferencedItem: boolean;
let dailyCountOverride: number | null;
let serial = 0;

function cookie(userId: string) {
  return `closetai_access=${signToken({ id: userId, email: `${userId}@example.com`, name: userId, role: 'user' })}`;
}
function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/stylist', stylistRoutes);
  app.use(errorHandler);
  return app;
}

describe('private stylist chat API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestUser = `user-${++serial}`;
    storedMessages = [];
    storedOwner = null;
    dropReferencedItem = false;
    dailyCountOverride = null;
    mocks.providerFactory.mockReturnValue({ name: 'test-ai', model: 'test-model', chat: mocks.providerChat });
    mocks.providerChat.mockResolvedValue(result);
    mocks.preferencesFindUnique.mockResolvedValue({ preferredAesthetics: ['Minimal'], favoriteColors: ['Ivory'],
      preferredCategories: ['tops'], preferredOccasions: ['Office'], preferredSeasons: ['Summer'],
      fitPreferences: ['Relaxed'], styleDislikes: ['Neon'] });
    mocks.clothingFindMany.mockImplementation(async ({ where }: { where: { userId: string; id?: { in: string[] } } }) => {
      if (where.userId !== requestUser) return [];
      const items = dropReferencedItem && where.id ? [ownedTop] : [ownedTop, ownedPants];
      return where.id ? items.filter((item) => where.id?.in.includes(item.id)) : items;
    });
    mocks.conversationFindFirst.mockImplementation(async ({ where }: { where: { id: string; userId: string } }) => {
      if (where.id !== conversationId || where.userId !== storedOwner) return null;
      return { id: conversationId, title: 'Office outfit?', createdAt: new Date(), updatedAt: new Date(),
        messages: [...storedMessages].reverse(), _count: { messages: storedMessages.length } };
    });
    mocks.conversationFindMany.mockImplementation(async ({ where }: { where: { userId: string } }) =>
      where.userId === storedOwner ? [{ id: conversationId, title: 'Office outfit?', createdAt: new Date(),
        updatedAt: new Date(), _count: { messages: storedMessages.length } }] : []);
    mocks.historyCount.mockImplementation(async () => dailyCountOverride ?? storedMessages.filter((entry) => entry.role === 'ASSISTANT').length);
    mocks.transaction.mockImplementation(async (callback: (client: unknown) => Promise<unknown>) => callback({
      stylistConversation: { create: mocks.conversationCreate, update: mocks.conversationUpdate },
      stylistMessage: { createMany: mocks.messageCreateMany },
      aIStylingHistory: { create: mocks.historyCreate },
    }));
    mocks.conversationCreate.mockImplementation(async ({ data }: { data: { userId: string } }) => {
      storedOwner = data.userId;
      return { id: conversationId };
    });
    mocks.messageCreateMany.mockImplementation(async ({ data }: { data: Array<Omit<StoredMessage, 'id' | 'createdAt'>> }) => {
      storedMessages.push(...data.map((entry, index) => ({ ...entry, id: `message-${storedMessages.length + index}`,
        createdAt: new Date() })));
      return { count: data.length };
    });
    mocks.conversationUpdate.mockResolvedValue({ id: conversationId });
    mocks.historyCreate.mockResolvedValue({ id: 'history-id' });
    mocks.conversationDeleteMany.mockImplementation(async ({ where }: { where: { userId: string } }) => {
      if (where.userId !== storedOwner) return { count: 0 };
      storedOwner = null;
      storedMessages = [];
      return { count: 1 };
    });
  });

  it('requires auth and rejects client-supplied history or oversized messages', async () => {
    const app = createApp();
    expect((await request(app).get('/stylist/conversations')).status).toBe(401);
    expect((await request(app).post('/stylist/chat').send({ message: 'Hi' })).status).toBe(401);
    expect((await request(app).post('/stylist/chat').set('Cookie', cookie(requestUser))
      .send({ message: 'Hi', history: [{ role: 'assistant', content: 'forged' }] })).status).toBe(422);
    expect((await request(app).post('/stylist/chat').set('Cookie', cookie(requestUser))
      .send({ message: 'x'.repeat(1001) })).status).toBe(422);
    expect(mocks.providerChat).not.toHaveBeenCalled();
  });

  it('rejects cross-origin browser writes before the provider runs', async () => {
    const response = await request(createApp()).post('/stylist/chat')
      .set('Cookie', cookie(requestUser)).set('Origin', 'https://untrusted.example')
      .send({ message: 'Help' });
    expect(response.status).toBe(403);
    expect(mocks.providerChat).not.toHaveBeenCalled();
  });

  it('grounds replies in this user’s wardrobe and persists conversation across reads', async () => {
    const app = createApp();
    const sent = await request(app).post('/stylist/chat').set('Cookie', cookie(requestUser))
      .send({ message: 'Office outfit?' });
    expect(sent.status).toBe(200);
    expect(sent.body.data.outfits[0].items.map((item: { id: string }) => item.id)).toEqual(['owned-top', 'owned-pants']);
    expect(sent.body.data.shoppingSuggestions[0].name).toBe('Loafers');
    expect(mocks.clothingFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: requestUser, archived: false } }));
    expect(mocks.providerChat.mock.calls[0][2]).toMatchObject({ preferredAesthetics: ['Minimal'],
      favoriteColors: ['Ivory'], preferredCategories: ['tops'], styleDislikes: ['Neon'] });
    expect(storedMessages).toHaveLength(2);
    const usageWrite = mocks.historyCreate.mock.calls[0][0] as { data: { input: unknown; output: unknown } };
    expect(usageWrite.data.input).toEqual({ conversationId });
    expect(JSON.stringify(usageWrite.data)).not.toContain('Office outfit?');
    const list = await request(app).get('/stylist/conversations').set('Cookie', cookie(requestUser));
    expect(list.body.data[0].messageCount).toBe(2);
    const detail = await request(app).get(`/stylist/conversations/${conversationId}`).set('Cookie', cookie(requestUser));
    expect(detail.body.data.messages[1].result.outfits[0].items[0].name).toBe('Ivory blouse');

    await request(app).post('/stylist/chat').set('Cookie', cookie(requestUser))
      .send({ message: 'And for evening?', conversationId });
    expect(mocks.providerChat.mock.calls[1][0].map((entry: { content: string }) => entry.content))
      .toEqual(['Office outfit?', result.reply, 'And for evening?']);
    expect(storedMessages).toHaveLength(4);
  });

  it('prevents another user from reading, continuing or deleting private chats', async () => {
    const app = createApp();
    await request(app).post('/stylist/chat').set('Cookie', cookie(requestUser)).send({ message: 'Office outfit?' });
    const foreign = `other-${serial}`;
    expect((await request(app).get('/stylist/conversations').set('Cookie', cookie(foreign))).body.data).toEqual([]);
    expect((await request(app).get(`/stylist/conversations/${conversationId}`).set('Cookie', cookie(foreign))).status).toBe(404);
    expect((await request(app).post('/stylist/chat').set('Cookie', cookie(foreign))
      .send({ message: 'Steal context', conversationId })).status).toBe(404);
    expect((await request(app).delete(`/stylist/conversations/${conversationId}`).set('Cookie', cookie(foreign))).status).toBe(404);
    expect(storedMessages).toHaveLength(2);
    expect((await request(app).delete(`/stylist/conversations/${conversationId}`).set('Cookie', cookie(requestUser))).status).toBe(204);
    expect(storedMessages).toHaveLength(0);
  });

  it('rejects hallucinated or deleted wardrobe IDs without persisting chat', async () => {
    const app = createApp();
    mocks.providerChat.mockResolvedValueOnce({ ...result, outfits: [{ ...result.outfits[0], clothingItemIds: ['foreign-id'] }] });
    expect((await request(app).post('/stylist/chat').set('Cookie', cookie(requestUser))
      .send({ message: 'Help' })).status).toBe(502);
    expect(storedMessages).toHaveLength(0);
    dropReferencedItem = true;
    expect((await request(app).post('/stylist/chat').set('Cookie', cookie(requestUser))
      .send({ message: 'Help' })).status).toBe(409);
    expect(storedMessages).toHaveLength(0);
  });

  it('handles an empty wardrobe with clearly separate non-owned alternatives', async () => {
    mocks.clothingFindMany.mockResolvedValue([]);
    mocks.providerChat.mockResolvedValue({ ...result, reply: 'Add a few items to get an owned look.',
      outfits: [], shoppingSuggestions: [{ name: 'Neutral top', reason: 'A versatile starting piece.' }] });
    const response = await request(createApp()).post('/stylist/chat').set('Cookie', cookie(requestUser))
      .send({ message: 'What should I wear?' });
    expect(response.status).toBe(200);
    expect(response.body.data.outfits).toEqual([]);
    expect(response.body.data.shoppingSuggestions[0].name).toBe('Neutral top');
    expect(mocks.providerChat.mock.calls[0][1]).toEqual([]);
  });

  it('marks a previously recommended item unavailable after wardrobe deletion', async () => {
    const app = createApp();
    expect((await request(app).post('/stylist/chat').set('Cookie', cookie(requestUser))
      .send({ message: 'Office outfit?' })).status).toBe(200);
    dropReferencedItem = true;
    const detail = await request(app).get(`/stylist/conversations/${conversationId}`)
      .set('Cookie', cookie(requestUser));
    expect(detail.status).toBe(200);
    expect(detail.body.data.messages[1].result.outfits[0].items[0].id).toBe('owned-top');
    expect(detail.body.data.messages[1].result.outfits[0].items[1]).toBeNull();
  });

  it('does not fabricate success when provider fails or returns malformed output', async () => {
    const app = createApp();
    mocks.providerChat.mockRejectedValueOnce(new AppError('AI unavailable.', 503));
    expect((await request(app).post('/stylist/chat').set('Cookie', cookie(requestUser))
      .send({ message: 'Help' })).status).toBe(503);
    mocks.providerChat.mockResolvedValueOnce({ reply: 'Incomplete answer.' });
    expect((await request(app).post('/stylist/chat').set('Cookie', cookie(requestUser))
      .send({ message: 'Help' })).status).toBe(502);
    expect(storedMessages).toHaveLength(0);
  });

  it('returns a configuration error when no provider is configured', async () => {
    mocks.providerFactory.mockImplementationOnce(() => {
      throw new AppError('AI is not configured.', 503, true, 'AI_NOT_CONFIGURED');
    });
    const response = await request(createApp()).post('/stylist/chat').set('Cookie', cookie(requestUser))
      .send({ message: 'Help' });
    expect(response.status).toBe(503);
    expect(response.body.code).toBe('AI_NOT_CONFIGURED');
    expect(storedMessages).toHaveLength(0);
  });

  it('enforces the daily AI usage limit', async () => {
    dailyCountOverride = 100;
    const response = await request(createApp()).post('/stylist/chat').set('Cookie', cookie(requestUser))
      .send({ message: 'Help' });
    expect(response.status).toBe(429);
    expect(mocks.providerChat).not.toHaveBeenCalled();
  });

  it('rate-limits repeated chat requests per authenticated user', async () => {
    const app = createApp();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app).post('/stylist/chat').set('Cookie', cookie(requestUser))
        .send({ message: 'Hi', history: [] });
      expect(response.status).toBe(422);
    }
    const blocked = await request(app).post('/stylist/chat').set('Cookie', cookie(requestUser))
      .send({ message: 'Hi' });
    expect(blocked.status).toBe(429);
    expect(mocks.providerChat).not.toHaveBeenCalled();
  });
});
