import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiProvider } from './geminiProvider';

const image = 'data:image/png;base64,iVBORw0KGgo=';
const analysis = { name: 'Ivory blouse', category: 'tops', colors: ['Ivory'], pattern: 'Solid',
  description: 'An ivory blouse with a button front.', seasons: ['Summer'], occasions: ['Office'],
  aesthetics: ['Classic'], confidence: 0.9 };
const response = (content: unknown) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(content) }] } }] }));

describe('Gemini native adapter', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('sends image bytes only to Google with a server-side key and returns validated item details', async () => {
    const fetch = vi.fn().mockResolvedValue(response(analysis));
    vi.stubGlobal('fetch', fetch);
    const provider = new GeminiProvider('test-gemini-key', 'test-gemini-model');
    expect(await provider.analyzeClothingImage(image)).toEqual(analysis);
    expect(provider.name).toBe('gemini');
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/test-gemini-model:generateContent');
    expect(options.headers['x-goog-api-key']).toBe('test-gemini-key');
    const body = JSON.parse(options.body);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.contents[0].parts[1].inlineData).toEqual({ mimeType: 'image/png', data: 'iVBORw0KGgo=' });
    expect(options.body).not.toContain('test-gemini-key');
  });

  it('rejects unexpected identifiers and incomplete model output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ...analysis, userId: 'foreign-user' })));
    await expect(new GeminiProvider('test-key').analyzeClothingImage(image))
      .rejects.toMatchObject({ code: 'AI_MALFORMED_RESPONSE' });
  });

  it.each([[401, 'AI_PROVIDER_AUTH_FAILED'], [403, 'AI_PROVIDER_AUTH_FAILED'], [429, 'AI_RATE_LIMITED']])(
    'returns a safe error for provider HTTP %s', async (status, code) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('secret provider details', { status })));
      await expect(new GeminiProvider('test-key').analyzeClothingImage(image)).rejects.toMatchObject({ code });
    });

  it('uses Google for chat too and labels its provider correctly', async () => {
    const fetch = vi.fn().mockResolvedValue(response({ reply: 'Add a light layer.', outfits: [], shoppingSuggestions: [], suggestions: [] }));
    vi.stubGlobal('fetch', fetch);
    const result = await new GeminiProvider('test-key').chat([{ role: 'user', content: 'Help me style a top.' }], []);
    expect(result.provider).toBe('gemini');
    expect(fetch.mock.calls[0][0]).toContain('generativelanguage.googleapis.com');
  });

  it('retries a temporary Gemini failure once and then returns the item description', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValueOnce(new Response('unavailable', { status: 503 })).mockResolvedValueOnce(response(analysis));
    vi.stubGlobal('fetch', fetch);
    const pending = new GeminiProvider('test-key').analyzeClothingImage(image);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toEqual(analysis);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('stops retrying after two unavailable responses', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValue(new Response('unavailable', { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    const pending = expect(new GeminiProvider('test-key').analyzeClothingImage(image))
      .rejects.toMatchObject({ code: 'AI_PROVIDER_UNAVAILABLE' });
    await vi.advanceTimersByTimeAsync(1000);
    await pending;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects an empty or blocked response instead of treating it as completed analysis', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [] }))));
    await expect(new GeminiProvider('test-key').analyzeClothingImage(image))
      .rejects.toMatchObject({ code: 'AI_MALFORMED_RESPONSE' });
  });

  it('recovers an outfit-generation request after one temporary provider failure', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValueOnce(new Response('unavailable', { status: 503 })).mockResolvedValueOnce(response({ outfits: [{
      title: 'Summer look', clothingItemIds: ['top', 'jeans'], occasion: 'Casual', aesthetic: 'Relaxed',
      explanation: 'A light top balances the dark denim.', score: 85,
    }] }));
    vi.stubGlobal('fetch', fetch);
    const pending = new GeminiProvider('test-key').generateOutfits({ wardrobeItems: [] });
    await vi.advanceTimersByTimeAsync(1000);
    expect((await pending).outfits).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
