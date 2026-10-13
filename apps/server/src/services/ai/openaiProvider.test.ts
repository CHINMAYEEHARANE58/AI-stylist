import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../utils/AppError';
import { OpenAIProvider } from './openaiProvider';

const image = 'data:image/png;base64,iVBORw0KGgo=';

function providerResponse(content: string, status = 200): Response {
  return new Response(status === 200 ? JSON.stringify({ choices: [{ message: { content } }] }) : '{}', { status });
}

describe('OpenAIProvider clothing analysis', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('accepts only the strict clothing-analysis shape', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(JSON.stringify({
      category: 'tops', colors: ['Ivory'], seasons: ['Summer'], occasions: ['Casual'],
      aesthetics: ['Minimal'], confidence: 0.91, description: 'An ivory sleeveless top.',
    }))));

    const analysis = await new OpenAIProvider('test-key', 'test-model').analyzeClothingImage(image);
    expect(analysis.category).toBe('tops');
    expect(analysis.description).toBe('An ivory sleeveless top.');
  });

  it('rejects malformed or over-permissive model output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(JSON.stringify({
      category: 'tops', colors: ['Ivory'], seasons: [], occasions: [], aesthetics: [], confidence: 0.9, userId: 'not-allowed',
    }))));

    await expect(new OpenAIProvider('test-key', 'test-model').analyzeClothingImage(image))
      .rejects.toMatchObject<AppError>({ code: 'AI_MALFORMED_RESPONSE', statusCode: 502 });
  });

  it('returns a safe rate-limit error instead of provider details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse('', 429)));

    await expect(new OpenAIProvider('test-key', 'test-model').analyzeClothingImage(image))
      .rejects.toMatchObject<AppError>({ code: 'AI_RATE_LIMITED', statusCode: 429 });
  });
});
