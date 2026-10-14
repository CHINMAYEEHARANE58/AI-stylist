import { describe, expect, it } from 'vitest';
import { keepEligibleStyleLooks, styleItemResultSchema } from './styleItemGeneration';

const look = {
  aesthetic: 'Minimal',
  clothingItemIds: ['anchor-a', 'companion-a'],
  occasion: 'Office',
  explanation: 'The dark trousers balance the light anchor top for a clean office look.',
};

describe('style-this-item validation', () => {
  it('accepts a complete look using the selected anchor and owned companions', () => {
    const result = styleItemResultSchema.parse({ looks: [look] });
    expect(keepEligibleStyleLooks(result.looks, 'anchor-a', new Set(['anchor-a', 'companion-a']))).toEqual([look]);
  });

  it('rejects malformed output, extra fields and duplicate anchor IDs', () => {
    expect(() => styleItemResultSchema.parse({ looks: [{ ...look, userId: 'user-b' }] })).toThrow();
    expect(() => styleItemResultSchema.parse({ looks: [{ ...look, clothingItemIds: ['anchor-a', 'anchor-a'] }] })).toThrow();
    expect(() => styleItemResultSchema.parse({ looks: [{ ...look, explanation: '' }] })).toThrow();
  });

  it('drops entire looks containing foreign, deleted, or missing anchor items', () => {
    const candidates = [
      look,
      { ...look, clothingItemIds: ['anchor-a', 'user-b-private'] },
      { ...look, clothingItemIds: ['anchor-a', 'deleted-item'] },
      { ...look, clothingItemIds: ['companion-a', 'other-a'] },
    ];
    expect(keepEligibleStyleLooks(candidates, 'anchor-a', new Set(['anchor-a', 'companion-a', 'other-a']))).toEqual([look]);
    expect(keepEligibleStyleLooks([look], 'anchor-a', new Set(['companion-a']))).toEqual([]);
  });
});
