import { describe, expect, it } from 'vitest';
import { catalogUrlSchema, scoreProduct } from './shoppingRecommendations';

const signals = {
  wardrobeCategories: ['tops', 'bottoms'], wardrobeColors: ['Ivory'],
  missingInspirationCategories: ['shoes'], preferredAesthetics: ['Minimal'],
  favoriteColors: ['Camel'], requestedOccasions: ['Office'],
};

describe('shopping recommendation matching and catalog URL safety', () => {
  it('scores real user signals with explainable, non-visual relevance', () => {
    const result = scoreProduct({ category: 'shoes', attributes: {
      colors: ['Camel'], aesthetics: ['Minimal'], occasions: ['Office'],
    } }, signals);
    expect(result.relevance).toBe(99);
    expect(result.matchedSignals).toContain('inspiration');
    expect(result.matchedSignals).toContain('wardrobe-gap');
    expect(result.reason).toMatch(/saved inspiration/);
    expect(result.reason).toMatch(/style preferences/);
  });

  it('does not claim prices or visual similarity for sparse data', () => {
    const result = scoreProduct({ category: 'tops', attributes: null }, {
      ...signals, wardrobeCategories: [], missingInspirationCategories: [],
      preferredAesthetics: [], favoriteColors: [], requestedOccasions: [],
    });
    expect(result.reason).not.toMatch(/price|similarity|discount/i);
    expect(result.matchedSignals).toEqual(['wardrobe-gap']);
  });

  it('honors saved category, dislike, and same-currency budget without inventing offers', () => {
    const preferred = scoreProduct({ category: 'shoes', attributes: {},
      currentOffers: [{ currency: 'USD', price: 75 }] }, { ...signals,
      preferredCategories: ['shoes'], styleDislikes: [], budgetCurrency: 'USD', budgetMax: 100 });
    expect(preferred.matchedSignals).toContain('preferred-category');
    expect(preferred.matchedSignals).toContain('budget');
    const differentCurrency = scoreProduct({ category: 'shoes', attributes: {},
      currentOffers: [{ currency: 'EUR', price: 75 }] }, { ...signals,
      budgetCurrency: 'USD', budgetMax: 100 });
    expect(differentCurrency.matchedSignals).not.toContain('budget');
    const disliked = scoreProduct({ name: 'Neon loafers', category: 'shoes', attributes: {} },
      { ...signals, styleDislikes: ['neon'] });
    expect(disliked.relevance).toBe(0);
  });

  it.each(['#', 'http://merchant.example/item', 'javascript:alert(1)',
    'https://localhost/item', 'https://127.0.0.1/item',
    'https://user:pass@merchant.example/item', 'https://192.168.1.2/item',
    'https://169.254.169.254/latest/meta-data', 'https://[::1]/item',
    'https://merchant.internal/item', 'https://merchant.example:8443/item'])(
    'rejects an invalid or unsafe product URL: %s', (url) => {
      expect(catalogUrlSchema.safeParse(url).success).toBe(false);
    });
  it('accepts a public HTTPS product URL', () => {
    expect(catalogUrlSchema.safeParse('https://shop.example.com/products/item-1').success).toBe(true);
  });
});
