import { z } from 'zod';

const shortText = (max: number) => z.string().trim().min(1).max(max);

/**
 * The only model-controlled shape accepted by the wardrobe analysis flow.
 * It deliberately contains no database identifiers, URLs, or ownership data.
 */
export const clothingAnalysisSchema = z.object({
  category: shortText(80),
  subcategory: shortText(80).optional(),
  colors: z.array(shortText(60)).min(1).max(5),
  pattern: shortText(80).optional(),
  material: shortText(80).optional(),
  sleeveStyle: shortText(80).optional(),
  fit: shortText(80).optional(),
  silhouette: shortText(80).optional(),
  seasons: z.array(shortText(60)).max(5),
  occasions: z.array(shortText(60)).max(6),
  aesthetics: z.array(shortText(60)).max(6),
  description: shortText(500).optional(),
  confidence: z.number().finite().min(0).max(1),
}).strict();

export type ValidatedClothingAnalysis = z.infer<typeof clothingAnalysisSchema>;
