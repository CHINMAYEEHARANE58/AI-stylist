import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import authRoutes from './authRoutes';
import { errorHandler } from '../middleware/errorHandler';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

describe('authentication route validation', () => {
  it('rejects malformed signup payloads before a database operation', async () => {
    const response = await request(createApp())
      .post('/auth/signup')
      .send({ name: 'A', email: 'not-an-email', password: 'short', unexpected: true });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Validation failed');
  });

  it('rejects a browser write from an untrusted origin', async () => {
    const response = await request(createApp())
      .post('/auth/login')
      .set('Origin', 'https://untrusted.example')
      .send({ email: 'person@example.com', password: 'password123' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('enforces six numeric digits for email verification', async () => {
    const response = await request(createApp())
      .post('/auth/verify-email')
      .send({ email: 'person@example.com', code: '12ab' });

    expect(response.status).toBe(422);
    expect(response.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'code' }),
    ]));
  });
});
