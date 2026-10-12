import { describe, expect, it } from 'vitest';
import { createOpaqueToken, hashOpaqueToken } from './sessionService';

describe('session token helpers', () => {
  it('creates unique opaque tokens and only persists a deterministic hash', () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(hashOpaqueToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashOpaqueToken(first)).toBe(hashOpaqueToken(first));
    expect(hashOpaqueToken(first)).not.toBe(first);
  });
});
