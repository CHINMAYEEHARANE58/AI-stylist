import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middleware/errorHandler';
import { signToken } from '../utils/token';

const mocks = vi.hoisted(() => ({
  events: new Map<string, Record<string, unknown>>(),
  eventCreate: vi.fn(), eventFindFirst: vi.fn(), eventFindMany: vi.fn(), eventCount: vi.fn(),
  eventUpdate: vi.fn(), eventDeleteMany: vi.fn(), outfitFindFirst: vi.fn(), notificationCreate: vi.fn(),
  suggest: vi.fn(),
}));
vi.mock('../config/db', () => ({ prisma: {
  calendarEvent: { create: mocks.eventCreate, findFirst: mocks.eventFindFirst,
    findMany: mocks.eventFindMany, count: mocks.eventCount, update: mocks.eventUpdate,
    deleteMany: mocks.eventDeleteMany },
  outfit: { findFirst: mocks.outfitFindFirst },
  notification: { create: mocks.notificationCreate },
  $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
    calendarEvent: { create: mocks.eventCreate }, notification: { create: mocks.notificationCreate },
  }),
} }));
vi.mock('../controllers/outfitController', () => ({ generateOutfitRecommendations: mocks.suggest }));
import calendarRoutes from './calendarRoutes';

const id = 'clx00000000000000000000001';
const cookie = (userId: string) => `closetai_access=${signToken({ id: userId, email: `${userId}@example.com`, name: userId, role: 'user' })}`;
const input = { title: 'Office presentation', eventType: 'Office',
  startsAt: '2030-07-01T09:00:00+05:30', endsAt: '2030-07-01T10:00:00+05:30',
  timeZone: 'Asia/Kolkata', description: 'Bring a layer' };
function app() { const server = express(); server.use(express.json()); server.use(cookieParser());
  server.use('/calendar', calendarRoutes); server.use(errorHandler); return server; }

describe('calendar event CRUD and ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.events.clear();
    mocks.eventCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      const event = { id, ...data, createdAt: new Date(), updatedAt: new Date() };
      mocks.events.set(id, event); return event;
    });
    mocks.eventFindFirst.mockImplementation(async ({ where }: { where: { id: string; userId: string } }) => {
      const event = mocks.events.get(where.id);
      return event?.userId === where.userId ? event : null;
    });
    mocks.eventFindMany.mockImplementation(async ({ where }: { where: { userId: string } }) =>
      [...mocks.events.values()].filter((event) => event.userId === where.userId));
    mocks.eventCount.mockImplementation(async ({ where }: { where: { userId: string } }) =>
      [...mocks.events.values()].filter((event) => event.userId === where.userId).length);
    mocks.eventUpdate.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const next = { ...mocks.events.get(where.id), ...data }; mocks.events.set(where.id, next); return next;
    });
    mocks.eventDeleteMany.mockImplementation(async ({ where }: { where: { id: string; userId: string } }) => {
      const row = mocks.events.get(where.id);
      if (row?.userId !== where.userId) return { count: 0 };
      mocks.events.delete(where.id); return { count: 1 };
    });
    mocks.notificationCreate.mockResolvedValue({ id: 'notice' });
    mocks.outfitFindFirst.mockResolvedValue(null);
    mocks.suggest.mockImplementation(async (_req: unknown, res: { status: (code: number) => { json: (value: unknown) => void } }) =>
      res.status(200).json({ success: true, data: { outfits: [] } }));
  });

  it('creates, lists, edits and deletes an event while persisting an offset timestamp', async () => {
    const server = app();
    expect((await request(server).get('/calendar')).status).toBe(401);
    const created = await request(server).post('/calendar').set('Cookie', cookie('user-a')).send(input);
    expect(created.status).toBe(201);
    expect(created.body.data.startsAt).toBe('2030-07-01T03:30:00.000Z');
    expect(created.body.data.timeZone).toBe('Asia/Kolkata');
    expect(mocks.notificationCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      userId: 'user-a', dedupeKey: `calendar-created:${id}`,
    }) }));
    expect((await request(server).get('/calendar').set('Cookie', cookie('user-a'))).body.data).toHaveLength(1);
    const updated = await request(server).patch(`/calendar/${id}`).set('Cookie', cookie('user-a'))
      .send({ description: 'Formal dress code' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.description).toBe('Formal dress code');
    expect((await request(server).delete(`/calendar/${id}`).set('Cookie', cookie('user-a'))).status).toBe(204);
    expect((await request(server).get('/calendar').set('Cookie', cookie('user-a'))).body.data).toHaveLength(0);
  });

  it('rejects invalid dates, zones, owner IDs and foreign outfit links', async () => {
    const server = app();
    for (const payload of [
      { ...input, startsAt: '2030-07-01T09:00:00', endsAt: '2030-07-01T10:00:00' },
      { ...input, endsAt: input.startsAt }, { ...input, timeZone: 'Not/AZone' },
      { ...input, userId: 'user-b' },
    ]) expect((await request(server).post('/calendar').set('Cookie', cookie('user-a')).send(payload)).status).toBe(422);
    expect((await request(server).post('/calendar').set('Cookie', cookie('user-a'))
      .send({ ...input, outfitId: id })).status).toBe(404);
  });

  it('isolates reads and writes for another user and forwards owned event suggestion context', async () => {
    const server = app();
    await request(server).post('/calendar').set('Cookie', cookie('user-a')).send(input);
    expect((await request(server).get('/calendar').set('Cookie', cookie('user-b'))).body.data).toHaveLength(0);
    expect((await request(server).patch(`/calendar/${id}`).set('Cookie', cookie('user-b'))
      .send({ title: 'Tampered' })).status).toBe(404);
    expect((await request(server).delete(`/calendar/${id}`).set('Cookie', cookie('user-b'))).status).toBe(404);
    await request(server).post(`/calendar/${id}/suggest`).set('Cookie', cookie('user-a'));
    expect(mocks.suggest).toHaveBeenCalledWith(expect.objectContaining({
      body: { eventId: id }, user: expect.objectContaining({ id: 'user-a' }),
    }), expect.anything());
  });
});
