import { z } from 'zod';
import { AppError } from '../../utils/AppError';
import type { OutfitGenerationInput, StylistChatResult, WardrobeItemSummary } from './types';

const outfitIdeaSchema = z.object({
  title: z.string().trim().min(1).max(100),
  clothingItemIds: z.array(z.string().min(1).max(100)).min(1).max(6),
  explanation: z.string().trim().min(1).max(500),
}).strict();

export const stylistChatOutputSchema = z.object({
  reply: z.string().trim().min(1).max(1800),
  outfits: z.array(outfitIdeaSchema).max(3),
  shoppingSuggestions: z.array(z.object({
    name: z.string().trim().min(1).max(100),
    reason: z.string().trim().min(1).max(300),
  }).strict()).max(4),
  suggestions: z.array(z.string().trim().min(1).max(160)).max(4),
}).strict();

export function validateStylistChatResult(
  value: unknown,
  wardrobe: WardrobeItemSummary[],
): Omit<StylistChatResult, 'provider' | 'model'> {
  const parsed = stylistChatOutputSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError('The stylist returned an invalid answer. Please retry.', 502, true, 'AI_MALFORMED_CHAT_RESPONSE');
  }
  const allowedIds = new Set(wardrobe.map((item) => item.id));
  for (const outfit of parsed.data.outfits) {
    const ids = outfit.clothingItemIds;
    if (new Set(ids).size !== ids.length || ids.some((id) => !allowedIds.has(id))) {
      throw new AppError('The stylist referenced unavailable clothing. Please retry.', 502, true, 'AI_INVALID_WARDROBE_REFERENCE');
    }
  }
  return parsed.data;
}

/** Keep provider context bounded while preferring items relevant to the request. */
export function selectRelevantWardrobe(
  items: WardrobeItemSummary[],
  message: string,
  preferences?: OutfitGenerationInput['userProfile'],
  limit = 60,
): WardrobeItemSummary[] {
  const terms = new Set(message.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
  const preferred = new Set([
    ...(preferences?.preferredAesthetics ?? []),
    ...(preferences?.favoriteColors ?? []),
    ...(preferences?.preferredCategories ?? []),
    ...(preferences?.preferredOccasions ?? []),
    ...(preferences?.preferredSeasons ?? []),
  ].map((value) => value.toLowerCase()));
  const scored = items.map((item, index) => {
    const fields = [item.name, item.category, item.pattern, item.material,
      ...item.colors, ...item.seasons, ...item.occasions, ...item.aesthetics]
      .filter(Boolean).join(' ').toLowerCase();
    const matches = [...terms].filter((term) => fields.includes(term)).length;
    const preferenceMatches = [...preferred].filter((value) => fields.includes(value)).length;
    const disliked = (preferences?.styleDislikes ?? []).some((value) => fields.includes(value.toLowerCase()));
    return { item, index, score: matches * 10 + preferenceMatches * 2 - (disliked ? 100 : 0) };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored.slice(0, limit).map(({ item }) => item);
}
