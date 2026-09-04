/**
 * Development mock AI provider.
 * Returns realistic but deterministic responses without any external API call.
 * Used automatically when no real AI key is configured.
 */
import type {
  AIProvider, ChatMessage, ClothingAnalysis, InspirationAnalysisResult,
  OutfitGenerationInput, OutfitGenerationResult, StyleThisItemResult,
  WardrobeItemSummary,
} from './types';

const AESTHETICS = ['Minimal', 'Classic', 'Elegant', 'Casual', 'Streetwear', 'Quiet luxury'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  readonly model = 'mock-dev-v1';

  async analyzeClothingImage(_imageUrl: string): Promise<ClothingAnalysis> {
    return {
      category: pick(['tops', 'blazers', 'jeans', 'dresses', 'outerwear', 'skirts', 'shoes', 'accessories']),
      subcategory: undefined,
      colors: pickN(['Ivory', 'Black', 'Camel', 'White', 'Navy', 'Beige', 'Grey'], 2),
      pattern: pick(['Solid', 'Stripe', 'Check', 'Floral', 'Abstract']),
      material: pick(['Cotton', 'Silk', 'Linen', 'Wool', 'Polyester', 'Denim', 'Leather']),
      sleeveStyle: pick(['Long sleeve', 'Short sleeve', 'Sleeveless', 'Off-shoulder']),
      seasons: pickN(['Spring', 'Summer', 'Autumn', 'Winter', 'All season'], 2),
      occasions: pickN(['Office', 'Casual', 'Party', 'Travel', 'Brunch', 'Date night'], 2),
      aesthetics: pickN(AESTHETICS, 2),
      confidence: 0.75,
    };
  }

  async generateOutfits(input: OutfitGenerationInput): Promise<OutfitGenerationResult> {
    const { wardrobeItems, occasion, mood } = input;

    if (wardrobeItems.length === 0) {
      return {
        outfits: [],
        provider: this.name,
        model: this.model,
      };
    }

    const aestheticsToGenerate = [
      pick(['Casual', 'Minimal']),
      pick(['Elegant', 'Classic']),
      pick(['Quiet luxury', 'Streetwear']),
    ];

    const outfits = aestheticsToGenerate.slice(0, Math.min(3, wardrobeItems.length)).map((aesthetic, i) => {
      const items = pickN(wardrobeItems, Math.min(3, wardrobeItems.length));
      return {
        title: `${aesthetic} ${occasion ?? 'Look'} ${i + 1}`,
        clothingItemIds: items.map((w) => w.id),
        occasion: occasion ?? 'Versatile',
        aesthetic,
        season: input.season,
        explanation: `A ${aesthetic.toLowerCase()} combination featuring ${items.map((w) => w.name).join(', ')}${mood ? `. Perfect for a ${mood} mood` : ''}.`,
        score: 80 + Math.floor(Math.random() * 18),
      };
    });

    return { outfits, provider: this.name, model: this.model };
  }

  async styleThisItem(
    item: WardrobeItemSummary,
    wardrobe: WardrobeItemSummary[],
  ): Promise<StyleThisItemResult> {
    const others = wardrobe.filter((w) => w.id !== item.id);
    const aestheticNames = ['Casual', 'Elegant', 'Office', 'Party'];

    const looks = aestheticNames.map((aesthetic) => {
      const companions = pickN(others, Math.min(2, others.length));
      return {
        aesthetic,
        clothingItemIds: [item.id, ...companions.map((c) => c.id)],
        explanation: `${item.name} works beautifully for a ${aesthetic.toLowerCase()} look${companions.length ? ` paired with ${companions.map((c) => c.name).join(' and ')}` : ''}.`,
        occasion: aesthetic === 'Office' ? 'Work' : aesthetic === 'Party' ? 'Evening' : aesthetic,
      };
    });

    return { itemId: item.id, itemName: item.name, looks, provider: this.name, model: this.model };
  }

  async analyzeInspirationImage(
    _imageUrl: string,
    wardrobe: WardrobeItemSummary[],
  ): Promise<InspirationAnalysisResult> {
    const matched = pickN(wardrobe, Math.min(3, wardrobe.length)).map((w) => ({
      clothingItemId: w.id,
      score: 70 + Math.floor(Math.random() * 28),
      reason: `${w.name} matches the ${pick(['colour palette', 'silhouette', 'aesthetic', 'occasion'])} of the inspiration.`,
    }));

    const allCategories = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'];
    const wardrobeCategories = new Set(wardrobe.map((w) => w.category));
    const missing = allCategories.filter((c) => !wardrobeCategories.has(c));

    return {
      detectedStyle: pick(['Quiet luxury', 'Minimal chic', 'Street polish', 'Romantic neutral']),
      colors: pickN(['Ivory', 'Camel', 'Black', 'Beige', 'Gold', 'Navy'], 3),
      categories: pickN(['tops', 'bottoms', 'outerwear', 'accessories'], 3),
      aesthetics: pickN(AESTHETICS, 2),
      silhouettes: [pick(['Relaxed', 'Structured', 'Flowing', 'Fitted', 'Oversized'])],
      matchedItems: matched,
      missingCategories: missing.slice(0, 2),
      recreationSuggestion: {
        clothingItemIds: matched.map((m) => m.clothingItemId),
        explanation: `Using items from your wardrobe that best match the inspiration's aesthetic.`,
        overallScore: matched.length > 0
          ? Math.round(matched.reduce((s, m) => s + m.score, 0) / matched.length)
          : 0,
      },
      provider: this.name,
      model: this.model,
    };
  }

  async chat(
    messages: ChatMessage[],
    wardrobeContext: WardrobeItemSummary[],
  ): Promise<{ reply: string; suggestions: string[]; provider: string; model: string }> {
    const last = messages[messages.length - 1]?.content?.toLowerCase() ?? '';

    let reply: string;
    if (last.includes('outfit') || last.includes('wear') || last.includes('today')) {
      const items = pickN(wardrobeContext, Math.min(3, wardrobeContext.length));
      reply = items.length
        ? `Based on your wardrobe, I'd suggest combining ${items.map((i) => i.name).join(', ')} for a polished look.`
        : `Add some items to your wardrobe first and I can suggest outfits!`;
    } else if (last.includes('color') || last.includes('colour')) {
      const colors = wardrobeContext.flatMap((w) => w.colors);
      const unique = [...new Set(colors)];
      reply = unique.length
        ? `Your wardrobe features ${unique.slice(0, 5).join(', ')}. These work beautifully together in tonal outfits.`
        : `I'd recommend building a neutral base palette — ivory, black, and camel are very versatile.`;
    } else if (last.includes('gap') || last.includes('missing') || last.includes('need')) {
      const categories = new Set(wardrobeContext.map((w) => w.category));
      const allCats = ['tops', 'bottoms', 'outerwear', 'shoes', 'accessories'];
      const gaps = allCats.filter((c) => !categories.has(c));
      reply = gaps.length
        ? `Your wardrobe is missing ${gaps.join(', ')}. These would unlock many more outfit combinations.`
        : `Your wardrobe looks well-rounded! Consider adding variety within your existing categories.`;
    } else {
      const item = pick(wardrobeContext);
      reply = item
        ? `I'm your personal stylist! Ask me about outfit ideas, colour matching, or what to wear for any occasion. I can see you have ${item.name} — want me to style it?`
        : `I'm your personal stylist! Add items to your wardrobe and I can help you create outfits for any occasion.`;
    }

    return {
      reply,
      suggestions: [
        'What should I wear today?',
        'Style my favourite item for a date night.',
        'What colours work best for me?',
        'What is missing from my wardrobe?',
      ],
      provider: this.name,
      model: this.model,
    };
  }
}
