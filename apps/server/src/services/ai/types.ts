/** Structured output from AI clothing analysis */
export interface ClothingAnalysis {
  category: string;
  subcategory?: string;
  colors: string[];
  pattern?: string;
  material?: string;
  sleeveStyle?: string;
  fit?: string;
  silhouette?: string;
  seasons: string[];
  occasions: string[];
  aesthetics: string[];
  description?: string;
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
  aesthetic?: string;
  colorPreference?: string;
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

export interface StyleItemOptions {
  aesthetics?: string[];
  occasion?: string;
  season?: string;
}

export interface StyleLook {
  aesthetic: string;
  clothingItemIds: string[];
  explanation: string;
  occasion: string;
}

/** Vision output contains attributes only; the model never receives wardrobe IDs. */
export interface InspirationAttributes {
  detectedStyle: string;
  colors: string[];
  patterns: string[];
  aesthetics: string[];
  silhouettes: string[];
  layers: string[];
  accessories: string[];
  garments: Array<{
    category: 'tops' | 'bottoms' | 'dresses' | 'outerwear' | 'shoes' | 'accessories';
    description: string;
    colors: string[];
    pattern?: string;
    silhouette?: string;
    layer?: 'base' | 'middle' | 'outer' | 'accessory';
  }>;
}

export interface InspirationAnalysisResult extends InspirationAttributes {
  matchedItems: MatchedItem[];
  missingPieces: Array<{ category: string; description: string; colors: string[]; reason: string }>;
  recreationSuggestion: {
    clothingItemIds: string[];
    explanation: string;
    overallScore: number;
  };
  matchingMethod: 'attribute-v1';
  provider: string;
  model: string;
}

export interface MatchedItem {
  clothingItemId: string;
  itemName: string;
  category: string;
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
  outfits: Array<{ title: string; clothingItemIds: string[]; explanation: string }>;
  shoppingSuggestions: Array<{ name: string; reason: string }>;
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
    options?: StyleItemOptions,
  ): Promise<StyleThisItemResult>;
  analyzeInspirationImage(
    imageDataUrl: string,
  ): Promise<InspirationAttributes>;
  chat(
    messages: ChatMessage[],
    wardrobeContext: WardrobeItemSummary[],
    userProfile?: { preferredAesthetics: string[]; favoriteColors: string[] },
  ): Promise<StylistChatResult>;
}
