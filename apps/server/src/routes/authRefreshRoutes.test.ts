import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middleware/errorHandler';

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), transaction: vi.fn(), create: vi.fn(), updateMany: vi.fn() }));
vi.mock('../config/db', () => ({ prisma: {
  refreshSession: { findUnique: mocks.findUnique }, $transaction: mocks.transaction,
} }));
import authRoutes from './authRoutes';

function app() {
  const server = express(); server.use(cookieParser()); server.use(express.json());
  server.use('/auth', authRoutes); server.use(errorHandler); return server;
}

describe('refresh rotation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue({ id: 'old-session', revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000), user: { id: 'user-a', email: 'test@example.test',
        role: 'USER', profile: { firstName: 'Test', lastName: null, imageUrl: null } } });
    mocks.create.mockResolvedValue({ id: 'new-session' });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({ refreshSession: { create: mocks.create, updateMany: mocks.updateMany } }));
  });

  it('rolls back and rejects a refresh when another request already revoked the token', async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const response = await request(app()).post('/auth/refresh').set('Cookie', 'closetai_refresh=opaque-token');
    expect(response.status).toBe(401);
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'old-session', revokedAt: null }),
    }));
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('issues HttpOnly successor cookies after a successful conditional rotation', async () => {
    mocks.updateMany.mockResolvedValue({ count: 1 });
    const response = await request(app()).post('/auth/refresh').set('Cookie', 'closetai_refresh=opaque-token');
    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({ id: 'user-a', email: 'test@example.test' });
    expect(JSON.stringify(response.body)).not.toContain('opaque-token');
    expect((response.headers['set-cookie'] as unknown as string[]).every((cookie) => cookie.includes('HttpOnly'))).toBe(true);
  });
});
