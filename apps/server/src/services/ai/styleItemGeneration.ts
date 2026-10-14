import { z } from 'zod';
import type { StyleLook } from './types';

const shortText = (max: number) => z.string().trim().min(1).max(max);

export const styleItemResultSchema = z.object({
  looks: z.array(z.object({
    aesthetic: shortText(100),
    clothingItemIds: z.array(shortText(120)).min(2).max(8)
      .refine((ids) => new Set(ids).size === ids.length, 'Each piece may appear only once.'),
    explanation: shortText(700),
    occasion: shortText(80),
  }).strict()).min(1).max(4),
}).strict();

/** Drop a complete look if any piece is not currently owned and available. */
export function keepEligibleStyleLooks(
  looks: StyleLook[],
  anchorId: string,
  eligibleIds: ReadonlySet<string>,
): StyleLook[] {
  return looks.filter((look) =>
    look.clothingItemIds.filter((id) => id === anchorId).length === 1
      && look.clothingItemIds.length >= 2
      && new Set(look.clothingItemIds).size === look.clothingItemIds.length
      && look.clothingItemIds.every((id) => eligibleIds.has(id)));
}
