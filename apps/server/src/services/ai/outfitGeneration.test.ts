import { describe, expect, it } from 'vitest';
import { outfitGenerationResultSchema, keepEligibleOutfits } from './outfitGeneration';

const valid = {
  title: 'Minimal workday', clothingItemIds: ['user-a-top', 'user-a-trouser'], occasion: 'Office',
  aesthetic: 'Minimal', explanation: 'The clean lines and neutral colours create a polished work look.', score: 90,
};

describe('outfit generation safeguards', () => {
  it('accepts a structured valid generation using owned IDs', () => {
    const parsed = outfitGenerationResultSchema.parse({ outfits: [valid] });
    expect(keepEligibleOutfits(parsed.outfits, new Set(['user-a-top', 'user-a-trouser']))).toHaveLength(1);
  });

  it('rejects malformed provider output before it reaches a user', () => {
    expect(() => outfitGenerationResultSchema.parse({ outfits: [{ ...valid, userId: 'forbidden' }] })).toThrow();
    expect(() => outfitGenerationResultSchema.parse({ outfits: [{ ...valid, clothingItemIds: ['same', 'same'] }] })).toThrow();
  });

  it('drops complete candidates containing foreign or deleted item IDs', () => {
    const candidates = [
      valid,
      { ...valid, title: 'Foreign item', clothingItemIds: ['user-a-top', 'user-b-private-item'] },
      { ...valid, title: 'Deleted item', clothingItemIds: ['user-a-top', 'deleted-item'] },
    ];
    const safe = keepEligibleOutfits(candidates, new Set(['user-a-top', 'user-a-trouser']));
    expect(safe).toEqual([valid]);
  });

  it('returns no candidates for an empty eligible wardrobe', () => {
    expect(keepEligibleOutfits([valid], new Set())).toEqual([]);
  });
});
