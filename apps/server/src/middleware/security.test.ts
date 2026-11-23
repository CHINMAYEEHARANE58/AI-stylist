import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { applySecurityMiddleware } from './security';
import { errorHandler } from './errorHandler';

describe('CORS rejection', () => {
  it('returns 403 without echoing an untrusted origin or an internal error', async () => {
    const app = express();
    applySecurityMiddleware(app);
    app.post('/private-write', (_req, res) => res.sendStatus(204));
    app.use(errorHandler);
    const response = await request(app).post('/private-write').set('Origin', 'https://attacker.example');
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ success: false, code: 'INVALID_ORIGIN' });
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
