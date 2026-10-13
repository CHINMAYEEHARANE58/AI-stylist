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

describe('OpenAIProvider outfit generation', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns structured outfits while leaving ID ownership validation to the server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(JSON.stringify({ outfits: [{
      title: 'Minimal office', clothingItemIds: ['item-a', 'item-b'], occasion: 'Office', aesthetic: 'Minimal',
      explanation: 'The neutral palette creates a polished work look.', score: 90,
    }] }))));

    const result = await new OpenAIProvider('test-key', 'test-model').generateOutfits({
      wardrobeItems: [
        { id: 'item-a', name: 'Top', category: 'tops', colors: ['Ivory'], seasons: [], occasions: [], aesthetics: [] },
        { id: 'item-b', name: 'Trousers', category: 'trousers', colors: ['Black'], seasons: [], occasions: [], aesthetics: [] },
      ],
    });
    expect(result.outfits[0].clothingItemIds).toEqual(['item-a', 'item-b']);
  });

  it('rejects malformed outfit output safely', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(JSON.stringify({ outfits: [{
      title: 'Malformed', clothingItemIds: ['item-a'], occasion: 'Casual', aesthetic: 'Minimal', explanation: 'x', score: 90, userId: 'forbidden',
    }] }))));

    await expect(new OpenAIProvider('test-key', 'test-model').generateOutfits({ wardrobeItems: [] }))
      .rejects.toMatchObject<AppError>({ code: 'AI_MALFORMED_OUTFIT_RESPONSE', statusCode: 502 });
  });
});
