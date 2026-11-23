import { describe, expect, it } from 'vitest';
import { envSchema } from './env';

describe('production environment validation', () => {
  const base = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://example.invalid/closetai',
    JWT_SECRET: 'a'.repeat(48), FRONTEND_URL: 'https://closetai.example', ALLOWED_ORIGINS: 'https://closetai.example' };

  it('rejects development defaults instead of silently starting a production API', () => {
    const result = envSchema.safeParse({ NODE_ENV: 'production' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.path[0]))
      .toEqual(expect.arrayContaining(['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL', 'ALLOWED_ORIGINS']));
  });

  it('accepts explicit HTTPS origins and rejects a missing frontend origin', () => {
    expect(envSchema.safeParse(base).success).toBe(true);
    expect(envSchema.safeParse({ ...base, ALLOWED_ORIGINS: 'https://other.example' }).success).toBe(false);
  });
});
