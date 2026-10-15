import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { configuredCatalogAdapter } from './catalogProvider';

/** Atomic replacement of one provider's observations for a canonical product. */
export async function syncProductOffers(productId: string): Promise<{ offerCount: number }> {
  const adapter = configuredCatalogAdapter();
  if (!adapter) {
    throw new AppError('No authorized shopping provider is configured.', 503, true, 'SHOPPING_PROVIDER_UNCONFIGURED');
  }
  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true, isSample: false },
    select: { id: true, source: true, sourceProductId: true } });
  if (!product) {throw new AppError('Product not found or unavailable.', 404);}
  if (product.source !== adapter.id || !product.sourceProductId) {
    throw new AppError('This product cannot be refreshed by the configured provider.', 409,
      true, 'SHOPPING_PROVIDER_MISMATCH');
  }

  // Fetch and validate the complete provider response before touching stored data.
  const offers = await adapter.getOffers(product.sourceProductId);
  await prisma.$transaction(async (tx) => {
    await tx.productOffer.updateMany({ where: { productId, provider: adapter.id },
      data: { expiresAt: new Date() } });
    for (const offer of offers) {
      await tx.productOffer.upsert({
        where: { productId_retailer_productUrl: { productId,
          retailer: offer.retailer, productUrl: offer.productUrl } },
        create: { productId, provider: adapter.id, retailer: offer.retailer,
          retailerSku: offer.retailerSku, productUrl: offer.productUrl,
          price: offer.price, currency: offer.currency, availability: offer.availability,
          observedAt: offer.observedAt, expiresAt: offer.expiresAt },
        update: { provider: adapter.id, retailerSku: offer.retailerSku,
          price: offer.price, currency: offer.currency, availability: offer.availability,
          observedAt: offer.observedAt, expiresAt: offer.expiresAt },
      });
    }
  });
  return { offerCount: offers.length };
}
