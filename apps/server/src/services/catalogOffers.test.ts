import { describe, expect, it } from 'vitest';
import { normalizeCurrency, presentOffers, primaryCurrentOffer, type StoredOffer } from './catalogOffers';

const now = new Date('2026-10-15T12:00:00.000Z');
const options = { now, allowedHosts: ['merchant.example'], maxAgeMinutes: 60 };
function offer(overrides: Partial<StoredOffer> = {}): StoredOffer {
  return { id: 'offer-1', provider: 'authorized-json', retailer: 'Authorized merchant',
    productUrl: 'https://merchant.example/product/1', price: '100.00', currency: 'USD',
    availability: 'In stock', observedAt: new Date('2026-10-15T11:30:00.000Z'), expiresAt: null,
    ...overrides };
}

describe('offer presentation', () => {
  it('normalizes ISO currencies and rejects unknown codes', () => {
    expect(normalizeCurrency(' usd ')).toBe('USD');
    expect(normalizeCurrency('ZZZ')).toBeNull();
  });

  it('keeps multiple offers and chooses the cheapest only within one currency', () => {
    const offers = presentOffers([offer(), offer({ id: 'offer-2', price: '80.50',
      productUrl: 'https://shop.merchant.example/item/2' })], options);
    expect(offers).toHaveLength(2);
    expect(primaryCurrentOffer(offers)?.price).toBe(80.5);
    expect(offers.every((item) => item.canBuy)).toBe(true);
  });

  it('does not select a lowest price across different currencies', () => {
    const offers = presentOffers([offer(), offer({ id: 'offer-2', currency: 'INR', price: '950.00' })], options);
    expect(offers).toHaveLength(2);
    expect(primaryCurrentOffer(offers)).toBeNull();
  });

  it('shows stale and expired observations without a purchase action or current card price', () => {
    const offers = presentOffers([offer({ observedAt: new Date('2026-10-14T12:00:00.000Z') }),
      offer({ id: 'offer-2', expiresAt: new Date('2026-10-15T11:00:00.000Z') }),
      offer({ id: 'offer-3', provider: 'legacy' })], options);
    expect(offers).toHaveLength(3);
    expect(offers.every((item) => item.freshness === 'stale' && !item.canBuy)).toBe(true);
    expect(primaryCurrentOffer(offers)).toBeNull();
  });

  it('never exposes unsafe merchant URLs, invalid prices, or unknown currencies', () => {
    const offers = presentOffers([offer({ productUrl: 'http://merchant.example/product/1' }),
      offer({ productUrl: 'https://merchant.example.evil.test/product/1' }),
      offer({ productUrl: 'https://127.0.0.1/product/1' }),
      offer({ price: '-5.00' }), offer({ currency: 'ZZZ' })], options);
    expect(offers).toEqual([]);
  });

  it('retains a fresh offer with unconfirmed availability but excludes known out-of-stock offers', () => {
    const offers = presentOffers([offer({ availability: null }),
      offer({ id: 'offer-2', price: '75.00', availability: 'Out of stock' })], options);
    expect(offers.find((item) => item.id === 'offer-1')?.canBuy).toBe(true);
    expect(offers.find((item) => item.id === 'offer-2')?.canBuy).toBe(false);
    expect(primaryCurrentOffer(offers)?.price).toBe(100);
  });
});
