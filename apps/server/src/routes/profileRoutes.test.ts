import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import profileRoutes from './profileRoutes';
import { errorHandler } from '../middleware/errorHandler';
import { signToken } from '../utils/token';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/profile', profileRoutes);
  app.use(errorHandler);
  return app;
}

const userACookie = `closetai_access=${signToken({ id: 'user-a', email: 'a@example.com', name: 'User A', role: 'user' })}`;

describe('profile ownership boundaries', () => {
  it('requires authentication before reading a profile', async () => {
    const response = await request(createApp()).get('/profile');
    expect(response.status).toBe(401);
  });

  it('rejects a user ID supplied as a body field rather than trusting it for ownership', async () => {
    const response = await request(createApp())
      .post('/profile/email-change/request')
      .set('Cookie', userACookie)
      .send({ newEmail: 'new@example.com', currentPassword: 'password123', userId: 'user-b' });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
  });

  it('does not expose an endpoint for looking up another user profile by ID', async () => {
    const response = await request(createApp()).get('/profile/user-b').set('Cookie', userACookie);
    expect(response.status).toBe(404);
  });
});
