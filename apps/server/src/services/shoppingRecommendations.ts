import { z } from 'zod';
import { isIP } from 'node:net';

const text = z.string().trim().min(1).max(100);
export const catalogUrlSchema = z.string().url().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password &&
      (!url.port || url.port === '443') && host.includes('.') &&
      host !== 'localhost' && !host.endsWith('.local') && !host.endsWith('.internal') &&
      !host.endsWith('.') && isIP(host.replace(/^\[|\]$/g, '')) === 0;
  } catch { return false; }
}, 'Use a public HTTPS product URL without credentials.');

export const productAttributesSchema = z.object({
  colors: z.array(text).max(12).default([]),
  aesthetics: z.array(text).max(12).default([]),
  occasions: z.array(text).max(12).default([]),
}).strip();

export interface ShoppingSignals {
  wardrobeCategories: string[];
  wardrobeColors: string[];
  missingInspirationCategories: string[];
  preferredAesthetics: string[];
  favoriteColors: string[];
  requestedOccasions: string[];
  preferredCategories?: string[];
  styleDislikes?: string[];
  budgetCurrency?: string | null;
  budgetMax?: number | null;
}

export function categoryGroup(value: string): string {
  const key = value.toLowerCase();
  if (/top|blouse|shirt|tee|sweater|knit|tank/.test(key)) {return 'tops';}
  if (/bottom|trouser|pant|jean|skirt|short/.test(key)) {return 'bottoms';}
  if (/dress|jumpsuit/.test(key)) {return 'dresses';}
  if (/outer|coat|jacket|blazer|trench/.test(key)) {return 'outerwear';}
  if (/shoe|sneaker|boot|heel|sandal|flat|loafer/.test(key)) {return 'shoes';}
  if (/accessor|bag|jewel|necklace|earring|belt|scarf/.test(key)) {return 'accessories';}
  return key;
}

function intersects(a: string[], b: string[]) {
  const right = new Set(b.map((value) => value.toLowerCase()));
  return a.some((value) => right.has(value.toLowerCase()));
}

export function scoreProduct(product: { name?: string; category: string | null; attributes: unknown;
  currentOffers?: Array<{ price: number; currency: string }> }, signals: ShoppingSignals) {
  const category = categoryGroup(product.category ?? '');
  const ownedCategories = new Set(signals.wardrobeCategories.map(categoryGroup));
  const parsedAttributes = productAttributesSchema.safeParse(product.attributes ?? {});
  const attributes = parsedAttributes.success ? parsedAttributes.data : { colors: [], aesthetics: [], occasions: [] };
  const reasons: string[] = [];
  const matchedSignals: string[] = [];
  let relevance = 15;
  const disliked = (signals.styleDislikes ?? []).some((value) => [product.name ?? '', category,
    ...attributes.colors, ...attributes.aesthetics].some((field) => field.toLowerCase().includes(value.toLowerCase())));
  if (disliked) {
    return { relevance: 0, reason: 'This item conflicts with a saved style dislike.', matchedSignals: ['style-dislike'] };
  }
  if ((signals.preferredCategories ?? []).some((value) => categoryGroup(value) === category)) {
    relevance += 10; reasons.push('Matches a preferred clothing category.'); matchedSignals.push('preferred-category');
  }
  if (signals.missingInspirationCategories.some((value) => categoryGroup(value) === category)) {
    relevance += 30; reasons.push('Fills a missing piece in your saved inspiration.'); matchedSignals.push('inspiration');
  }
  if (!ownedCategories.has(category)) {
    relevance += 25; reasons.push(`Adds a ${category || 'new'} category to your wardrobe.`); matchedSignals.push('wardrobe-gap');
  }
  const complements: Record<string, string[]> = {
    tops: ['bottoms', 'dresses'], bottoms: ['tops'], dresses: ['shoes', 'outerwear'],
    shoes: ['tops', 'bottoms', 'dresses'], outerwear: ['tops', 'bottoms', 'dresses'],
    accessories: ['tops', 'bottoms', 'dresses'],
  };
  const matchedCompanions = (complements[category] ?? []).filter((value) => ownedCategories.has(value));
  if (matchedCompanions.length) {
    relevance += 8;
    reasons.push(`Could complete looks with your owned ${matchedCompanions.slice(0, 2).join(' and ')}.`);
    matchedSignals.push('wardrobe-combination');
  }
  if (intersects(attributes.aesthetics, signals.preferredAesthetics)) {
    relevance += 15; reasons.push('Matches your saved style preferences.'); matchedSignals.push('style');
  }
  if (intersects(attributes.colors, signals.favoriteColors)) {
    relevance += 8; reasons.push('Matches a favorite color.'); matchedSignals.push('color');
  } else if (intersects(attributes.colors, signals.wardrobeColors)) {
    relevance += 5; reasons.push('Shares a color with your wardrobe.'); matchedSignals.push('wardrobe-color');
  }
  if (intersects(attributes.occasions, signals.requestedOccasions)) {
    relevance += 12; reasons.push('Fits an occasion you have styled recently.'); matchedSignals.push('occasion');
  }
  const comparable = product.currentOffers?.filter((offer) => offer.currency === signals.budgetCurrency) ?? [];
  const budgetMax = signals.budgetMax;
  if (budgetMax !== null && budgetMax !== undefined && comparable.length) {
    if (comparable.some((offer) => offer.price <= budgetMax)) {
      relevance += 8; reasons.push('A recent offer is within your saved budget.'); matchedSignals.push('budget');
    } else {
      relevance = Math.max(0, relevance - 30);
      reasons.push('Recent offers in your chosen currency exceed your saved budget.');
      matchedSignals.push('over-budget');
    }
  }
  if (!reasons.length) {reasons.push('Explore this catalog item alongside your wardrobe.');}
  return { relevance: Math.min(relevance, 99), reason: reasons.join(' '), matchedSignals };
}
