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

describe('OpenAIProvider style this item', () => {
  afterEach(() => vi.unstubAllGlobals());
  const anchor = { id: 'anchor-a', name: 'Ivory Top', category: 'tops', colors: ['Ivory'], seasons: ['Summer'], occasions: ['Office'], aesthetics: ['Minimal'] };
  const companion = { id: 'companion-a', name: 'Black Trousers', category: 'trousers', colors: ['Black'], seasons: ['Summer'], occasions: ['Office'], aesthetics: ['Minimal'] };

  it('passes selected options and accepts structured styling output', async () => {
    const fetchMock = vi.fn().mockResolvedValue(providerResponse(JSON.stringify({ looks: [{
      aesthetic: 'Minimal', clothingItemIds: ['anchor-a', 'companion-a'], occasion: 'Office',
      explanation: 'Black trousers balance the light anchor for a polished office look.',
    }] })));
    vi.stubGlobal('fetch', fetchMock);
    const result = await new OpenAIProvider('test-key', 'test-model').styleThisItem(anchor, [anchor, companion], { aesthetics: ['Minimal'], occasion: 'Office', season: 'Summer' });
    expect(result.looks[0].clothingItemIds).toEqual(['anchor-a', 'companion-a']);
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { messages: Array<{ content: string }> };
    expect(requestBody.messages[1].content).toContain('Requested season: Summer');
  });

  it('rejects malformed styling output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(JSON.stringify({ looks: [{
      aesthetic: 'Minimal', clothingItemIds: ['anchor-a'], occasion: 'Office', explanation: 'Incomplete look.',
    }] }))));
    await expect(new OpenAIProvider('test-key', 'test-model').styleThisItem(anchor, [anchor, companion]))
      .rejects.toMatchObject<AppError>({ code: 'AI_MALFORMED_STYLE_RESPONSE', statusCode: 502 });
  });
});

describe('OpenAIProvider stylist chat', () => {
  afterEach(() => vi.unstubAllGlobals());
  const wardrobe = [{ id: 'owned-top', name: 'Ivory blouse', category: 'tops', colors: ['Ivory'],
    seasons: ['Summer'], occasions: ['Office'], aesthetics: ['Minimal'] }];

  it('sends exact owned IDs and saved preferences, then validates the model reply', async () => {
    const fetchMock = vi.fn().mockResolvedValue(providerResponse(JSON.stringify({
      reply: 'Wear the ivory blouse.', outfits: [{ title: 'Office', clothingItemIds: ['owned-top'], explanation: 'Light and polished.' }],
      shoppingSuggestions: [], suggestions: ['What shoes?'],
    })));
    vi.stubGlobal('fetch', fetchMock);
    const result = await new OpenAIProvider('test-key', 'test-model').chat(
      [{ role: 'user', content: 'Office outfit?' }], wardrobe,
      { preferredAesthetics: ['Minimal'], favoriteColors: ['Ivory'] },
    );
    expect(result.outfits[0].clothingItemIds).toEqual(['owned-top']);
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { messages: Array<{ content: string }> };
    expect(request.messages[0].content).toContain('owned-top');
    expect(request.messages[0].content).toContain('Minimal');
  });

  it('rejects malformed output and invented IDs instead of displaying a fake reply', async () => {
    for (const content of ['not-json', JSON.stringify({ reply: 'hi' }), JSON.stringify({
      reply: 'Wear this.', outfits: [{ title: 'Fake', clothingItemIds: ['foreign-item'], explanation: 'A look.' }],
      shoppingSuggestions: [], suggestions: [],
    })]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse(content)));
      await expect(new OpenAIProvider('test-key', 'test-model').chat([{ role: 'user', content: 'Help' }], wardrobe))
        .rejects.toMatchObject<AppError>({ statusCode: 502 });
    }
  });

  it('surfaces provider failures without leaking the provider response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse('', 503)));
    await expect(new OpenAIProvider('test-key', 'test-model').chat([{ role: 'user', content: 'Help' }], wardrobe))
      .rejects.toMatchObject<AppError>({ code: 'AI_PROVIDER_UNAVAILABLE', statusCode: 503 });
  });
});
