import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getOffers: vi.fn(), productFindFirst: vi.fn(), offerUpdateMany: vi.fn(), offerUpsert: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock('../config/db', () => ({ prisma: {
  product: { findFirst: mocks.productFindFirst },
  $transaction: mocks.transaction,
} }));
vi.mock('./catalogProvider', () => ({ configuredCatalogAdapter: () => ({
  id: 'authorized-json', getOffers: mocks.getOffers,
}) }));
import { syncProductOffers } from './syncProductOffers';

describe('offer synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.productFindFirst.mockResolvedValue({ id: 'product-1', source: 'authorized-json',
      sourceProductId: 'catalog-1' });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({ productOffer: { updateMany: mocks.offerUpdateMany, upsert: mocks.offerUpsert } }));
  });

  it('expires old observations and stores every validated merchant offer in one transaction', async () => {
    mocks.getOffers.mockResolvedValue([{ retailer: 'A', productUrl: 'https://merchant.example/a',
      price: '10.00', currency: 'USD', observedAt: new Date(), expiresAt: null },
    { retailer: 'B', productUrl: 'https://merchant.example/b',
      price: '12.00', currency: 'USD', observedAt: new Date(), expiresAt: null }]);
    expect(await syncProductOffers('product-1')).toEqual({ offerCount: 2 });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.offerUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { productId: 'product-1', provider: 'authorized-json' } }));
    expect(mocks.offerUpsert).toHaveBeenCalledTimes(2);
    expect(mocks.offerUpsert.mock.calls[0]?.[0].create.price).toBe('10.00');
  });

  it('does not touch stored offers if the provider fails validation or rate limits', async () => {
    mocks.getOffers.mockRejectedValue(new Error('invalid provider response'));
    await expect(syncProductOffers('product-1')).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.offerUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects products not mapped to the configured source', async () => {
    mocks.productFindFirst.mockResolvedValue({ id: 'product-1', source: 'other-provider',
      sourceProductId: 'catalog-1' });
    await expect(syncProductOffers('product-1')).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.getOffers).not.toHaveBeenCalled();
  });
});
