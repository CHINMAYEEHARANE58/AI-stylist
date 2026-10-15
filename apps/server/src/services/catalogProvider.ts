import { z } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { catalogUrlSchema } from './shoppingRecommendations';
import { normalizeCurrency, normalizedMerchantHosts, trustedMerchantUrl } from './catalogOffers';

export interface ProviderOffer {
  retailer: string;
  retailerSku: string | null;
  productUrl: string;
  price: string;
  currency: string;
  availability: string | null;
  observedAt: Date;
  expiresAt: Date | null;
}
export interface CatalogOfferAdapter {
  readonly id: string;
  getOffers(sourceProductId: string): Promise<ProviderOffer[]>;
}

const feedOffer = z.object({
  merchant: z.string().trim().min(1).max(100),
  merchantSku: z.string().trim().min(1).max(200).optional(),
  productUrl: z.string().url().max(2048),
  price: z.string().regex(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/),
  currency: z.string().trim().length(3),
  availability: z.enum(['in_stock', 'out_of_stock', 'preorder']).optional(),
  observedAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }).optional(),
}).strict();
const feedResponse = z.object({ offers: z.array(feedOffer).max(50) }).strict();

/** Contract for a licensed backend JSON feed; no retailer pages are fetched or scraped. */
export class AuthorizedJsonFeedAdapter implements CatalogOfferAdapter {
  readonly id = 'authorized-json';
  private readonly endpoint: URL;

  constructor(private readonly config: { url: string; token: string; allowedMerchantHosts: string[];
    timeoutMs: number }, private readonly request: typeof fetch = fetch) {
    if (!catalogUrlSchema.safeParse(config.url).success || !config.allowedMerchantHosts.length) {
      throw new AppError('Shopping feed configuration is incomplete.', 503, true, 'SHOPPING_PROVIDER_UNCONFIGURED');
    }
    this.endpoint = new URL(config.url);
  }

  async getOffers(sourceProductId: string): Promise<ProviderOffer[]> {
    const url = new URL(this.endpoint);
    url.searchParams.set('product_id', sourceProductId);
    let response: Response;
    try {
      response = await this.request(url, { method: 'GET',
        headers: { Authorization: `Bearer ${this.config.token}`, Accept: 'application/json' },
        redirect: 'error', signal: AbortSignal.timeout(this.config.timeoutMs) });
    } catch {
      throw new AppError('Shopping provider is temporarily unavailable.', 502, true, 'SHOPPING_PROVIDER_FAILED');
    }
    if (response.status === 429) {
      throw new AppError('Shopping provider rate limit reached. Try again later.', 429, true, 'SHOPPING_PROVIDER_RATE_LIMIT');
    }
    if (!response.ok) {
      throw new AppError('Shopping provider is temporarily unavailable.', 502, true, 'SHOPPING_PROVIDER_FAILED');
    }
    let payload: unknown;
    try {
      const body = await response.text();
      if (body.length > 256_000) {throw new Error('Feed response too large');}
      payload = JSON.parse(body) as unknown;
    } catch {
      throw new AppError('Shopping provider returned an invalid response.', 502, true, 'SHOPPING_PROVIDER_INVALID');
    }
    const parsed = feedResponse.safeParse(payload);
    if (!parsed.success) {
      throw new AppError('Shopping provider returned an invalid response.', 502, true, 'SHOPPING_PROVIDER_INVALID');
    }
    const now = Date.now();
    return parsed.data.offers.map((offer) => {
      const currency = normalizeCurrency(offer.currency);
      const observedAt = new Date(offer.observedAt);
      if (!currency || Number(offer.price) <= 0 ||
        !trustedMerchantUrl(offer.productUrl, this.config.allowedMerchantHosts) ||
        observedAt.getTime() > now + 5 * 60_000) {
        throw new AppError('Shopping provider returned an unsafe offer.', 502, true, 'SHOPPING_PROVIDER_INVALID');
      }
      return { retailer: offer.merchant, retailerSku: offer.merchantSku ?? null,
        productUrl: offer.productUrl, price: offer.price, currency,
        availability: offer.availability === 'in_stock' ? 'In stock'
          : offer.availability === 'out_of_stock' ? 'Out of stock'
          : offer.availability === 'preorder' ? 'Preorder' : null,
        observedAt, expiresAt: offer.expiresAt ? new Date(offer.expiresAt) : null };
    });
  }
}

export function configuredCatalogAdapter(): CatalogOfferAdapter | null {
  if (env.SHOPPING_PROVIDER === 'none') {return null;}
  if (!env.SHOPPING_FEED_URL || !env.SHOPPING_FEED_TOKEN) {return null;}
  const allowedMerchantHosts = normalizedMerchantHosts(env.SHOPPING_ALLOWED_MERCHANT_HOSTS);
  if (!catalogUrlSchema.safeParse(env.SHOPPING_FEED_URL).success || !allowedMerchantHosts.length) {return null;}
  return new AuthorizedJsonFeedAdapter({ url: env.SHOPPING_FEED_URL,
    token: env.SHOPPING_FEED_TOKEN,
    allowedMerchantHosts,
    timeoutMs: env.SHOPPING_FEED_TIMEOUT_MS });
}
