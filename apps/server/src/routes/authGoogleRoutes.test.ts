import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middleware/errorHandler';

const mockEnv = vi.hoisted(() => ({
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
  GOOGLE_CALLBACK_URL: '',
  FRONTEND_URL: 'http://localhost:3001',
  NODE_ENV: 'test',
  COOKIE_SECURE: false,
  JWT_SECRET: 'test-secret-for-google-route-tests',
  ALLOWED_ORIGINS: ['http://localhost:3001'],
}));
vi.mock('../config/env', () => ({ env: mockEnv }));
vi.mock('../config/db', () => ({ prisma: {} }));
import authRoutes from './authRoutes';

function app() {
  const server = express();
  server.use(cookieParser());
  server.use(express.json());
  server.use('/auth', authRoutes);
  server.use(errorHandler);
  return server;
}

describe('Google sign-in start', () => {
  beforeEach(() => {
    mockEnv.GOOGLE_CLIENT_ID = '';
    mockEnv.GOOGLE_CLIENT_SECRET = '';
    mockEnv.GOOGLE_CALLBACK_URL = '';
  });

  it('reports unavailable and returns the user to login instead of exposing an API error page', async () => {
    const server = app();
    const status = await request(server).get('/auth/google/status');
    expect(status.status).toBe(200);
    expect(status.body.data).toEqual({ available: false });
    const start = await request(server).get('/auth/google');
    expect(start.status).toBe(302);
    expect(start.headers.location).toBe('http://localhost:3001/login?error=google_signin_unavailable');
    expect(start.headers['set-cookie']).toBeUndefined();
  });

  it('does not treat example credentials as a configured Google client', async () => {
    mockEnv.GOOGLE_CLIENT_ID = 'your-google-client-id';
    mockEnv.GOOGLE_CLIENT_SECRET = 'your-google-client-secret';
    mockEnv.GOOGLE_CALLBACK_URL = 'http://localhost:4000/api/v1/auth/google/callback';
    expect((await request(app()).get('/auth/google/status')).body.data.available).toBe(false);
  });

  it('starts a stateful PKCE authorization redirect when a client is configured', async () => {
    mockEnv.GOOGLE_CLIENT_ID = 'test-client.apps.googleusercontent.com';
    mockEnv.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    mockEnv.GOOGLE_CALLBACK_URL = 'http://localhost:4000/api/v1/auth/google/callback';
    const server = app();
    expect((await request(server).get('/auth/google/status')).body.data.available).toBe(true);
    const start = await request(server).get('/auth/google');
    expect(start.status).toBe(302);
    const location = new URL(start.headers.location);
    expect(location.hostname).toBe('accounts.google.com');
    expect(location.searchParams.get('client_id')).toBe(mockEnv.GOOGLE_CLIENT_ID);
    expect(location.searchParams.get('redirect_uri')).toBe(mockEnv.GOOGLE_CALLBACK_URL);
    expect(location.searchParams.get('prompt')).toBe('select_account');
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('state')).toBeTruthy();
    expect((start.headers['set-cookie'] as unknown as string[]).every((cookie) => cookie.includes('HttpOnly'))).toBe(true);
  });
});
