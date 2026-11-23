import { z } from 'zod';

const shortText = (max: number) => z.string().trim().min(1).max(max);

export const analysisCategories = ['tops', 'shirts', 'blazers', 'jeans', 'trousers', 'skirts', 'dresses', 'shoes', 'sneakers', 'accessories', 'outerwear'] as const;
export const analysisSeasons = ['Spring', 'Summer', 'Autumn', 'Winter', 'All season'] as const;
export const analysisOccasions = ['Office', 'Casual', 'Party', 'Brunch', 'Travel', 'Date night', 'Vacation', 'Wedding'] as const;
export const analysisStyles = ['Minimal', 'Classic', 'Elegant', 'Casual', 'Streetwear', 'Quiet luxury', 'Old money', 'Romantic'] as const;

/**
 * The only model-controlled shape accepted by the wardrobe analysis flow.
 * It deliberately contains no database identifiers, URLs, or ownership data.
 */
export const clothingAnalysisSchema = z.object({
  name: shortText(120),
  category: z.enum(analysisCategories),
  subcategory: shortText(80).optional(),
  colors: z.array(shortText(60)).min(1).max(5),
  pattern: shortText(80).optional(),
  material: shortText(80).optional(),
  sleeveStyle: shortText(80).optional(),
  fit: shortText(80).optional(),
  silhouette: shortText(80).optional(),
  seasons: z.array(z.enum(analysisSeasons)).min(1).max(5),
  occasions: z.array(z.enum(analysisOccasions)).min(1).max(6),
  aesthetics: z.array(z.enum(analysisStyles)).min(1).max(6),
  description: shortText(500),
  confidence: z.number().finite().min(0).max(1),
}).strict();

export type ValidatedClothingAnalysis = z.infer<typeof clothingAnalysisSchema>;
