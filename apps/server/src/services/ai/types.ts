/** Structured output from AI clothing analysis */
export interface ClothingAnalysis {
  category: string;
  subcategory?: string;
  colors: string[];
  pattern: string;
  material?: string;
  sleeveStyle?: string;
  seasons: string[];
  occasions: string[];
  aesthetics: string[];
  confidence: number; // 0-1
}

/** One outfit in a generated set */
export interface GeneratedOutfit {
  title: string;
  clothingItemIds: string[];
  occasion: string;
  aesthetic: string;
  season?: string;
  explanation: string;
  score: number; // 0-100
}

/** Output from outfit generator */
export interface OutfitGenerationResult {
  outfits: GeneratedOutfit[];
  provider: string;
  model: string;
}

/** Input for outfit generator */
export interface OutfitGenerationInput {
  occasion?: string;
  weather?: string;
  mood?: string;
  season?: string;
  notes?: string;
  anchorItemId?: string;
  wardrobeItems: WardrobeItemSummary[];
  userProfile?: {
    preferredAesthetics: string[];
    favoriteColors: string[];
  };
}

/** Minimal wardrobe item summary sent to AI */
export interface WardrobeItemSummary {
  id: string;
  name: string;
  category: string;
  colors: string[];
  seasons: string[];
  occasions: string[];
  aesthetics: string[];
  pattern?: string;
  material?: string;
}

/** Style-this-item result */
export interface StyleThisItemResult {
  itemId: string;
  itemName: string;
  looks: StyleLook[];
  provider: string;
  model: string;
}

export interface StyleLook {
  aesthetic: string;
  clothingItemIds: string[];
  explanation: string;
  occasion: string;
}

/** Inspiration analysis result */
export interface InspirationAnalysisResult {
  detectedStyle: string;
  colors: string[];
  categories: string[];
  aesthetics: string[];
  silhouettes: string[];
  matchedItems: MatchedItem[];
  missingCategories: string[];
  recreationSuggestion: {
    clothingItemIds: string[];
    explanation: string;
    overallScore: number;
  };
  provider: string;
  model: string;
}

export interface MatchedItem {
  clothingItemId: string;
  score: number;
  reason: string;
}

/** Chat message */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Stylist chat result */
export interface StylistChatResult {
  reply: string;
  suggestions: string[];
  provider: string;
  model: string;
}

/** Provider interface — all AI providers implement this */
export interface AIProvider {
  name: string;
  model: string;
  analyzeClothingImage(imageUrl: string): Promise<ClothingAnalysis>;
  generateOutfits(input: OutfitGenerationInput): Promise<OutfitGenerationResult>;
  styleThisItem(
    item: WardrobeItemSummary,
    wardrobe: WardrobeItemSummary[],
  ): Promise<StyleThisItemResult>;
  analyzeInspirationImage(
    imageUrl: string,
    wardrobe: WardrobeItemSummary[],
  ): Promise<InspirationAnalysisResult>;
  chat(
    messages: ChatMessage[],
    wardrobeContext: WardrobeItemSummary[],
    userProfile?: { preferredAesthetics: string[]; favoriteColors: string[] },
  ): Promise<StylistChatResult>;
}
