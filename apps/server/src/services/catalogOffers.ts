import { catalogUrlSchema } from './shoppingRecommendations';

const supportedCurrencies = new Set(Intl.supportedValuesOf('currency'));

export function normalizeCurrency(value: string): string | null {
  const currency = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) && supportedCurrencies.has(currency) ? currency : null;
}

export function normalizedMerchantHosts(value: string): string[] {
  return value.split(',').map((host) => host.trim().toLowerCase()).filter((host) =>
    /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host) && !host.endsWith('.local'));
}

export function trustedMerchantUrl(value: string, allowedHosts: string[]): boolean {
  if (!allowedHosts.length || !catalogUrlSchema.safeParse(value).success) {return false;}
  const host = new URL(value).hostname.toLowerCase();
  return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

export type OfferFreshness = 'fresh' | 'stale';
export interface StoredOffer {
  id: string;
  provider: string;
  retailer: string;
  productUrl: string;
  price: unknown;
  currency: string;
  availability: string | null;
  observedAt: Date;
  expiresAt: Date | null;
}
export interface PresentedOffer {
  id: string;
  store: string;
  url: string;
  price: number;
  currency: string;
  availability: string | null;
  observedAt: Date;
  freshness: OfferFreshness;
  canBuy: boolean;
}

/** Never equate an old observation with a current offer. Legacy rows have no verified provenance. */
export function presentOffers(
  offers: StoredOffer[],
  options: { allowedHosts: string[]; maxAgeMinutes: number; now?: Date },
): PresentedOffer[] {
  const now = options.now ?? new Date();
  return offers.flatMap((offer) => {
    if (!trustedMerchantUrl(offer.productUrl, options.allowedHosts)) {return [];}
    const currency = normalizeCurrency(offer.currency);
    const priceText = String(offer.price);
    const price = Number(offer.price);
    if (!currency || !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(priceText) ||
      !Number.isFinite(price) || price <= 0 || !(offer.observedAt instanceof Date) ||
      Number.isNaN(offer.observedAt.getTime()) || offer.observedAt.getTime() > now.getTime() + 5 * 60_000) {return [];}
    const fresh = offer.provider !== 'legacy' &&
      now.getTime() - offer.observedAt.getTime() <= options.maxAgeMinutes * 60_000 &&
      (!offer.expiresAt || offer.expiresAt.getTime() > now.getTime());
    const availability = offer.availability === 'In stock' || offer.availability === 'Out of stock' ||
      offer.availability === 'Preorder' ? offer.availability : null;
    return [{ id: offer.id, store: offer.retailer, url: offer.productUrl, price,
      currency, availability, observedAt: offer.observedAt,
      freshness: fresh ? 'fresh' as const : 'stale' as const,
      canBuy: fresh && availability !== 'Out of stock' }];
  }).sort((a, b) => a.currency.localeCompare(b.currency) ||
    (a.freshness === b.freshness ? a.price - b.price : a.freshness === 'fresh' ? -1 : 1));
}

/** A card price is meaningful only if every current offer uses the same currency. */
export function primaryCurrentOffer(offers: PresentedOffer[]): PresentedOffer | null {
  const current = offers.filter((offer) => offer.freshness === 'fresh' && offer.canBuy);
  if (new Set(current.map((offer) => offer.currency)).size !== 1) {return null;}
  return [...current].sort((a, b) => a.price - b.price)[0] ?? null;
}
