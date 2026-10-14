import { describe, expect, it } from 'vitest';
import { inspirationAttributesSchema, matchInspirationAttributes } from './inspirationMatching';

const attributes = {
  detectedStyle: 'Minimal layers', colors: ['Ivory', 'Black'], patterns: ['Solid'],
  aesthetics: ['Minimal'], silhouettes: ['Tailored'], layers: ['Top over skirt'], accessories: [],
  garments: [
    { category: 'tops' as const, description: 'Ivory blouse', colors: ['Ivory'], pattern: 'Solid' },
    { category: 'bottoms' as const, description: 'Black skirt', colors: ['Black'], silhouette: 'Tailored' },
    { category: 'shoes' as const, description: 'Black heels', colors: ['Black'] },
  ],
};

describe('inspiration attribute matching', () => {
  it('rejects model-created IDs, extra fields, and unsupported categories', () => {
    expect(inspirationAttributesSchema.safeParse({ ...attributes, userId: 'foreign' }).success).toBe(false);
    expect(inspirationAttributesSchema.safeParse({ ...attributes, garments: [{ category: 'hats', description: 'Hat', colors: [] }] }).success).toBe(false);
    expect(inspirationAttributesSchema.safeParse({ ...attributes, garments: [{ category: 'tops', description: 'Top', colors: [], clothingItemId: 'invented' }] }).success).toBe(false);
  });

  it('scores owned categories and colors without pretending to compare image embeddings', () => {
    const result = matchInspirationAttributes(attributes, [
      { id: 'top-a', name: 'Ivory Satin Blouse', category: 'tops', colors: ['Cream'], pattern: 'Solid', silhouette: null, fit: null, aesthetics: ['Minimal'] },
      { id: 'bottom-a', name: 'Black Skirt', category: 'skirts', colors: ['Black'], pattern: null, silhouette: 'Tailored', fit: null, aesthetics: [] },
    ], 'openai', 'vision-model');
    expect(result.matchedItems.map((item) => item.clothingItemId)).toEqual(['top-a', 'bottom-a']);
    expect(result.matchedItems[0].score).toBe(90);
    expect(result.matchedItems[0].reason).toMatch(/Approximate attribute match/);
    expect(result.missingPieces).toMatchObject([{ category: 'shoes', description: 'Black heels' }]);
    expect(result.recreationSuggestion.overallScore).toBe(Math.round((90 + 80) / 3));
    expect(result.matchingMethod).toBe('attribute-v1');
  });

  it('reports all garments missing when the wardrobe is empty', () => {
    const result = matchInspirationAttributes(attributes, [], 'mock', 'dev');
    expect(result.matchedItems).toEqual([]);
    expect(result.missingPieces).toHaveLength(3);
    expect(result.recreationSuggestion.overallScore).toBe(0);
  });
});
