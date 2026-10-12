import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import wardrobeRoutes from './wardrobeRoutes';
import { errorHandler } from '../middleware/errorHandler';
import { signToken } from '../utils/token';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/wardrobe', wardrobeRoutes);
  app.use(errorHandler);
  return app;
}

const userACookie = `closetai_access=${signToken({ id: 'user-a', email: 'a@example.com', name: 'User A', role: 'user' })}`;

describe('wardrobe request boundaries', () => {
  it('requires authentication before listing private clothing items', async () => {
    const response = await request(createApp()).get('/wardrobe');
    expect(response.status).toBe(401);
  });

  it('rejects invalid pagination before querying the database', async () => {
    const response = await request(createApp()).get('/wardrobe?page=0').set('Cookie', userACookie);
    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Validation failed');
  });

  it('rejects mass-assignment fields on clothing updates before database access', async () => {
    const response = await request(createApp())
      .patch('/wardrobe/item-b')
      .set('Cookie', userACookie)
      .send({ userId: 'user-b', name: 'Attempted overwrite' });
    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
  });
});
