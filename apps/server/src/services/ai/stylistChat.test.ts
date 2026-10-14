import { describe, expect, it } from 'vitest';
import { selectRelevantWardrobe, validateStylistChatResult } from './stylistChat';
import { MockAIProvider } from './mockProvider';

const wardrobe = [
  { id: 'owned-top', name: 'Ivory blouse', category: 'tops', colors: ['Ivory'], seasons: ['Summer'], occasions: ['Office'], aesthetics: ['Minimal'] },
  { id: 'owned-pants', name: 'Black trousers', category: 'bottoms', colors: ['Black'], seasons: ['Winter'], occasions: ['Office'], aesthetics: ['Classic'] },
];

describe('stylist chat grounding', () => {
  it('accepts distinct owned IDs and keeps shopping separate', () => {
    expect(validateStylistChatResult({
      reply: 'Try this office combination.',
      outfits: [{ title: 'Office', clothingItemIds: ['owned-top', 'owned-pants'], explanation: 'The neutrals balance.' }],
      shoppingSuggestions: [{ name: 'Loafers', reason: 'An optional finishing piece.' }], suggestions: [],
    }, wardrobe).outfits[0].clothingItemIds).toEqual(['owned-top', 'owned-pants']);
  });

  it('rejects foreign, hallucinated, duplicate and malformed references', () => {
    const base = { reply: 'A look.', shoppingSuggestions: [], suggestions: [] };
    for (const ids of [['owned-top', 'foreign'], ['owned-top', 'owned-top'], ['made-up']]) {
      expect(() => validateStylistChatResult({ ...base,
        outfits: [{ title: 'Invalid', clothingItemIds: ids, explanation: 'Why.' }],
      }, wardrobe)).toThrow();
    }
    expect(() => validateStylistChatResult({ ...base, outfits: [], userId: 'foreign-user' }, wardrobe)).toThrow();
    expect(() => validateStylistChatResult({ reply: '', outfits: [], shoppingSuggestions: [], suggestions: [] }, wardrobe)).toThrow();
  });

  it('ranks request-matching wardrobe items ahead of unrelated ones', () => {
    expect(selectRelevantWardrobe(wardrobe, 'office ivory blouse', undefined, 1)[0].id).toBe('owned-top');
    expect(selectRelevantWardrobe(wardrobe, 'something classic', { preferredAesthetics: ['Classic'], favoriteColors: [] }, 1)[0].id).toBe('owned-pants');
  });

  it('labels the development fixture and keeps its named pieces aligned with owned IDs', async () => {
    const response = await new MockAIProvider().chat([{ role: 'user', content: 'What should I wear?' }], wardrobe);
    expect(response.reply).toContain('Development mock');
    expect(response.outfits[0].clothingItemIds).toEqual(['owned-top', 'owned-pants']);
    expect(response.reply).toContain('Ivory blouse');
    expect(response.reply).toContain('Black trousers');
  });
});
