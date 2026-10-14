import { z } from 'zod';
import type { InspirationAnalysisResult, InspirationAttributes } from './types';

const shortText = z.string().trim().min(1).max(120);
const strings = z.array(shortText).max(16);
export const inspirationAttributesSchema = z.object({
  detectedStyle: shortText,
  colors: strings,
  patterns: strings,
  aesthetics: strings,
  silhouettes: strings,
  layers: strings,
  accessories: strings,
  garments: z.array(z.object({
    category: z.enum(['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories']),
    description: z.string().trim().min(1).max(240),
    colors: z.array(shortText).max(5),
    pattern: shortText.optional(),
    silhouette: shortText.optional(),
    layer: z.enum(['base', 'middle', 'outer', 'accessory']).optional(),
  }).strict()).min(1).max(12),
}).strict();

export interface MatchableWardrobeItem {
  id: string;
  name: string;
  category: string;
  colors: string[];
  pattern: string | null;
  silhouette: string | null;
  fit: string | null;
  aesthetics: string[];
}

function normalized(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function categoryOf(value: string): InspirationAttributes['garments'][number]['category'] | null {
  const category = normalized(value);
  if (/top|shirt|blouse|sweater|knit|tee|t shirt|tank/.test(category)) { return 'tops'; }
  if (/bottom|trouser|pant|jean|skirt|short|legging/.test(category)) { return 'bottoms'; }
  if (/dress|jumpsuit|romper/.test(category)) { return 'dresses'; }
  if (/outer|coat|jacket|blazer|trench|cardigan/.test(category)) { return 'outerwear'; }
  if (/shoe|sneaker|boot|heel|sandal|flat|loafer/.test(category)) { return 'shoes'; }
  if (/accessor|bag|tote|jewel|necklace|earring|belt|scarf|hat|watch/.test(category)) { return 'accessories'; }
  return null;
}

const COLOR_FAMILIES: Record<string, string> = {
  ivory: 'cream', cream: 'cream', offwhite: 'cream', white: 'cream', ecru: 'cream',
  beige: 'beige', camel: 'beige', tan: 'beige', sand: 'beige',
  black: 'black', charcoal: 'black', grey: 'grey', gray: 'grey',
  navy: 'blue', blue: 'blue', denim: 'blue',
  burgundy: 'red', maroon: 'red', red: 'red',
};

function colorFamily(value: string): string {
  const color = normalized(value).replace(/ /g, '');
  return COLOR_FAMILIES[color] ?? color;
}

function scoreItem(garment: InspirationAttributes['garments'][number], aesthetics: string[], item: MatchableWardrobeItem) {
  let score = 45; // Same garment category; not a visual-similarity score.
  const reasons = ['same garment category'];
  const sharedColors = garment.colors.filter((color) => item.colors.some((own) => colorFamily(own) === colorFamily(color)));
  if (sharedColors.length) { score += 25; reasons.push(`similar ${sharedColors[0]} color family`); }
  if (garment.pattern && item.pattern && normalized(garment.pattern) === normalized(item.pattern)) {
    score += 10; reasons.push('matching pattern');
  }
  const garmentSilhouette = garment.silhouette ? normalized(garment.silhouette) : null;
  if (garmentSilhouette && [item.silhouette, item.fit].some((value) => value && normalized(value) === garmentSilhouette)) {
    score += 10; reasons.push('matching silhouette or fit');
  }
  if (aesthetics.some((value) => item.aesthetics.some((own) => normalized(own) === normalized(value)))) {
    score += 10; reasons.push('shared aesthetic tag');
  }
  return { score, reason: `Approximate attribute match: ${reasons.join(', ')}.` };
}

/** Deterministic, explainable matching over records selected for the authenticated user. */
export function matchInspirationAttributes(
  attributes: InspirationAttributes,
  wardrobe: MatchableWardrobeItem[],
  provider: string,
  model: string,
): InspirationAnalysisResult {
  const used = new Set<string>();
  const matchedItems: InspirationAnalysisResult['matchedItems'] = [];
  const missingPieces: InspirationAnalysisResult['missingPieces'] = [];

  for (const garment of attributes.garments) {
    const candidates = wardrobe
      .filter((item) => !used.has(item.id) && categoryOf(item.category) === garment.category)
      .map((item) => ({ item, ...scoreItem(garment, attributes.aesthetics, item) }))
      .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
    const best = candidates[0];
    if (!best) {
      missingPieces.push({
        category: garment.category,
        description: garment.description,
        colors: garment.colors,
        reason: 'No available item in this garment category in your wardrobe.',
      });
      continue;
    }
    used.add(best.item.id);
    matchedItems.push({ clothingItemId: best.item.id, itemName: best.item.name,
      category: garment.category, score: best.score, reason: best.reason });
  }

  const overallScore = Math.round(matchedItems.reduce((sum, item) => sum + item.score, 0) / attributes.garments.length);
  return {
    ...attributes,
    matchedItems,
    missingPieces,
    recreationSuggestion: {
      clothingItemIds: matchedItems.map((item) => item.clothingItemId),
      explanation: matchedItems.length
        ? `These ${matchedItems.length} owned pieces cover ${matchedItems.length} of ${attributes.garments.length} detected garment categories. Missing pieces are listed separately.`
        : 'No current wardrobe pieces match the detected garment categories. Add similar pieces or try another inspiration.',
      overallScore,
    },
    matchingMethod: 'attribute-v1',
    provider,
    model,
  };
}
