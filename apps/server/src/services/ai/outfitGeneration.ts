import { z } from 'zod';
import type { GeneratedOutfit } from './types';

const text = (max: number) => z.string().trim().min(1).max(max);

/** The complete provider-controlled shape for outfit generation. */
export const generatedOutfitSchema = z.object({
  title: text(160),
  clothingItemIds: z.array(text(120)).min(1).max(8)
    .refine((ids) => new Set(ids).size === ids.length, 'Outfit item IDs must be unique.'),
  occasion: text(80),
  aesthetic: text(100),
  season: text(80).optional(),
  explanation: text(700),
  score: z.number().finite().min(0).max(100),
}).strict();

export const outfitGenerationResultSchema = z.object({
  outfits: z.array(generatedOutfitSchema).min(1).max(4),
}).strict();

/**
 * A candidate is usable only if every returned ID remains in the requesting
 * user's eligible wardrobe. Dropping an entire candidate prevents a partial,
 * misleading outfit when an item was invented, archived, deleted, or foreign.
 */
export function keepEligibleOutfits(
  outfits: GeneratedOutfit[],
  eligibleItemIds: ReadonlySet<string>,
): GeneratedOutfit[] {
  return outfits.filter((outfit) => outfit.clothingItemIds.every((id) => eligibleItemIds.has(id)));
}
