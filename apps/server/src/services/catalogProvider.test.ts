import { describe, expect, it, vi } from 'vitest';
import { AuthorizedJsonFeedAdapter } from './catalogProvider';

const config = { url: 'https://feed.example/api/offers', token: 'test-only-token',
  allowedMerchantHosts: ['merchant.example'], timeoutMs: 1000 };
const validOffer = { merchant: 'Merchant', productUrl: 'https://merchant.example/p/1',
  price: '99.95', currency: 'usd', availability: 'in_stock', observedAt: new Date().toISOString() };

function adapter(response: Response | Error) {
  const request = vi.fn(async () => { if (response instanceof Error) throw response; return response; });
  return { client: new AuthorizedJsonFeedAdapter(config, request as typeof fetch), request };
}

describe('authorized JSON offer adapter', () => {
  it('reads multiple licensed offers with a backend bearer credential and no redirects', async () => {
    const { client, request } = adapter(new Response(JSON.stringify({ offers: [validOffer,
      { ...validOffer, merchant: 'Second merchant', productUrl: 'https://shop.merchant.example/p/1',
        price: '95.00', currency: 'INR' }] }), { status: 200 }));
    const offers = await client.getOffers('provider-product-1');
    expect(offers).toHaveLength(2);
    expect(offers.map((offer) => offer.currency)).toEqual(['USD', 'INR']);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ searchParams: expect.anything() }),
      expect.objectContaining({ redirect: 'error', headers: expect.objectContaining({
        Authorization: 'Bearer test-only-token' }) }));
    expect(String(request.mock.calls[0]?.[0])).toContain('product_id=provider-product-1');
  });

  it('keeps a provider rate limit distinct from other failures', async () => {
    const { client } = adapter(new Response('', { status: 429 }));
    await expect(client.getOffers('product')).rejects.toMatchObject({ statusCode: 429,
      code: 'SHOPPING_PROVIDER_RATE_LIMIT' });
  });

  it('fails safely for outages and malformed feed output', async () => {
    await expect(adapter(new Error('secret socket detail')).client.getOffers('product')).rejects.toMatchObject({
      statusCode: 502, code: 'SHOPPING_PROVIDER_FAILED' });
    await expect(adapter(new Response('{', { status: 200 })).client.getOffers('product')).rejects.toMatchObject({
      statusCode: 502, code: 'SHOPPING_PROVIDER_INVALID' });
    await expect(adapter(new Response(JSON.stringify({ offers: [{ ...validOffer, price: '-4.00' }] }),
      { status: 200 })).client.getOffers('product')).rejects.toMatchObject({ statusCode: 502 });
  });

  it('rejects untrusted merchant domains and incomplete provider configuration', async () => {
    await expect(adapter(new Response(JSON.stringify({ offers: [{ ...validOffer,
      productUrl: 'https://merchant.example.evil.test/p/1' }] }), { status: 200 }))
      .client.getOffers('product')).rejects.toMatchObject({ statusCode: 502 });
    expect(() => new AuthorizedJsonFeedAdapter({ ...config, allowedMerchantHosts: [] })).toThrow();
  });
});
