/**
 * OpenAI GPT-4o provider implementation.
 * Only instantiated when OPENAI_API_KEY is set.
 */
import { z } from 'zod';
import type {
  AIProvider, ChatMessage, ClothingAnalysis, InspirationAnalysisResult,
  OutfitGenerationInput, OutfitGenerationResult, StyleThisItemResult,
  WardrobeItemSummary,
} from './types';
import { logger } from '../../config/logger';

// ── Zod schemas for output validation ─────────────────────────────────

const clothingAnalysisSchema = z.object({
  category: z.string(),
  subcategory: z.string().optional(),
  colors: z.array(z.string()).min(1).max(5),
  pattern: z.string(),
  material: z.string().optional(),
  sleeveStyle: z.string().optional(),
  seasons: z.array(z.string()).min(1).max(5),
  occasions: z.array(z.string()).min(1).max(6),
  aesthetics: z.array(z.string()).min(1).max(4),
  confidence: z.number().min(0).max(1),
});

const generatedOutfitSchema = z.object({
  title: z.string().max(100),
  clothingItemIds: z.array(z.string()),
  occasion: z.string(),
  aesthetic: z.string(),
  season: z.string().optional(),
  explanation: z.string().max(500),
  score: z.number().min(0).max(100),
});

const outfitResultSchema = z.object({
  outfits: z.array(generatedOutfitSchema).max(6),
});

const styleLookSchema = z.object({
  aesthetic: z.string(),
  clothingItemIds: z.array(z.string()),
  explanation: z.string().max(400),
  occasion: z.string(),
});

const styleItemResultSchema = z.object({
  looks: z.array(styleLookSchema).max(6),
});

const inspirationResultSchema = z.object({
  detectedStyle: z.string(),
  colors: z.array(z.string()),
  categories: z.array(z.string()),
  aesthetics: z.array(z.string()),
  silhouettes: z.array(z.string()),
  matchedItems: z.array(z.object({
    clothingItemId: z.string(),
    score: z.number().min(0).max(100),
    reason: z.string(),
  })),
  missingCategories: z.array(z.string()),
  recreationSuggestion: z.object({
    clothingItemIds: z.array(z.string()),
    explanation: z.string(),
    overallScore: z.number().min(0).max(100),
  }),
});

// ── OpenAI fetch helper ────────────────────────────────────────────────

async function openAIChat(
  apiKey: string,
  messages: Array<{ role: string; content: string | Array<{ type: string; [k: string]: unknown }> }>,
  model = 'gpt-4o',
  timeoutMs = 30_000,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`OpenAI API error ${resp.status}: ${body.slice(0, 200)}`);
    }

    const data = await resp.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? '{}';
  } finally {
    clearTimeout(timer);
  }
}

// ── Provider ──────────────────────────────────────────────────────────

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  readonly model = 'gpt-4o';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeClothingImage(imageUrl: string): Promise<ClothingAnalysis> {
    const systemPrompt = `You are a fashion AI assistant. Analyze the clothing item in this image and respond with a JSON object matching this exact structure:
{
  "category": "tops|shirts|blazers|jeans|trousers|skirts|dresses|shoes|sneakers|accessories|bags|outerwear",
  "subcategory": "optional string",
  "colors": ["primary color", "secondary color"],
  "pattern": "Solid|Stripe|Check|Floral|Abstract|Geometric|Animal print",
  "material": "optional fabric name",
  "sleeveStyle": "optional sleeve description",
  "seasons": ["Spring|Summer|Autumn|Winter|All season"],
  "occasions": ["Office|Casual|Party|Brunch|Travel|Date night|Vacation|Wedding"],
  "aesthetics": ["Minimal|Classic|Elegant|Casual|Streetwear|Quiet luxury|Old money|Romantic"],
  "confidence": 0.0-1.0
}`;

    const raw = await openAIChat(this.apiKey, [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this clothing item:' },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      },
    ]);

    const parsed = JSON.parse(raw) as unknown;
    return clothingAnalysisSchema.parse(parsed);
  }

  async generateOutfits(input: OutfitGenerationInput): Promise<OutfitGenerationResult> {
    const wardrobeSummary = input.wardrobeItems.map((w) =>
      `ID:${w.id} | ${w.name} | ${w.category} | Colors:${w.colors.join(',')} | Occasions:${w.occasions.join(',')}`
    ).join('\n');

    const systemPrompt = `You are an expert personal stylist. Create outfit combinations using ONLY the wardrobe items provided by their exact IDs. Never invent items that are not in the list.

Respond with a JSON object:
{
  "outfits": [
    {
      "title": "descriptive title",
      "clothingItemIds": ["exact-id-from-list"],
      "occasion": "occasion string",
      "aesthetic": "style aesthetic",
      "season": "optional season",
      "explanation": "brief styling explanation",
      "score": 0-100
    }
  ]
}`;

    const userMsg = `Create 3-4 outfit combinations for:
Occasion: ${input.occasion ?? 'any'}
Weather: ${input.weather ?? 'unspecified'}
Mood: ${input.mood ?? 'any'}
Season: ${input.season ?? 'any'}
${input.anchorItemId ? `Build around item ID: ${input.anchorItemId}` : ''}
${input.notes ? `Notes: ${input.notes}` : ''}

Available wardrobe items:
${wardrobeSummary}`;

    const raw = await openAIChat(this.apiKey, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMsg },
    ]);

    const parsed = outfitResultSchema.parse(JSON.parse(raw) as unknown);

    // Validate that all returned IDs actually exist
    const validIds = new Set(input.wardrobeItems.map((w) => w.id));
    const validOutfits = parsed.outfits.map((o) => ({
      ...o,
      clothingItemIds: o.clothingItemIds.filter((id) => validIds.has(id)),
    })).filter((o) => o.clothingItemIds.length > 0);

    return { outfits: validOutfits, provider: this.name, model: this.model };
  }

  async styleThisItem(
    item: WardrobeItemSummary,
    wardrobe: WardrobeItemSummary[],
  ): Promise<StyleThisItemResult> {
    const others = wardrobe.filter((w) => w.id !== item.id);
    const othersStr = others.map((w) =>
      `ID:${w.id} | ${w.name} | ${w.category} | Colors:${w.colors.join(',')}`
    ).join('\n');

    const systemPrompt = `You are a personal stylist. Create multiple outfit looks featuring the anchor item, using ONLY items from the available wardrobe. Never invent items.

Respond with:
{
  "looks": [
    {
      "aesthetic": "style name",
      "clothingItemIds": ["anchor-id", "companion-ids"],
      "explanation": "styling tip",
      "occasion": "occasion"
    }
  ]
}`;

    const raw = await openAIChat(this.apiKey, [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Anchor item: ID:${item.id} | ${item.name} | ${item.category} | Colors:${item.colors.join(',')}

Other wardrobe items to pair with:
${othersStr}

Create looks for: Casual, Elegant, Office, Party aesthetics.`,
      },
    ]);

    const parsed = styleItemResultSchema.parse(JSON.parse(raw) as unknown);
    const validIds = new Set(wardrobe.map((w) => w.id));

    const looks = parsed.looks.map((l) => ({
      ...l,
      clothingItemIds: l.clothingItemIds.filter((id) => validIds.has(id)),
    })).filter((l) => l.clothingItemIds.includes(item.id));

    return { itemId: item.id, itemName: item.name, looks, provider: this.name, model: this.model };
  }

  async analyzeInspirationImage(
    imageUrl: string,
    wardrobe: WardrobeItemSummary[],
  ): Promise<InspirationAnalysisResult> {
    const wardrobeStr = wardrobe.map((w) =>
      `ID:${w.id} | ${w.name} | ${w.category} | Colors:${w.colors.join(',')} | Aesthetics:${w.aesthetics.join(',')}`
    ).join('\n');

    const systemPrompt = `You are a fashion AI. Analyze the inspiration image then match it to the user's wardrobe items. Use ONLY provided wardrobe IDs.

Respond with:
{
  "detectedStyle": "style name",
  "colors": ["colors in image"],
  "categories": ["clothing categories in image"],
  "aesthetics": ["aesthetics"],
  "silhouettes": ["silhouette descriptions"],
  "matchedItems": [{"clothingItemId": "exact-id", "score": 0-100, "reason": "why it matches"}],
  "missingCategories": ["categories in inspiration not in wardrobe"],
  "recreationSuggestion": {
    "clothingItemIds": ["ids for recreation"],
    "explanation": "how to recreate",
    "overallScore": 0-100
  }
}`;

    const raw = await openAIChat(this.apiKey, [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: `Analyze this inspiration image and match to wardrobe:\n${wardrobeStr}` },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'low' } },
        ],
      },
    ]);

    const parsed = inspirationResultSchema.parse(JSON.parse(raw) as unknown);
    const validIds = new Set(wardrobe.map((w) => w.id));

    return {
      ...parsed,
      matchedItems: parsed.matchedItems.filter((m) => validIds.has(m.clothingItemId)),
      recreationSuggestion: {
        ...parsed.recreationSuggestion,
        clothingItemIds: parsed.recreationSuggestion.clothingItemIds.filter((id) => validIds.has(id)),
      },
      provider: this.name,
      model: this.model,
    };
  }

  async chat(
    messages: ChatMessage[],
    wardrobeContext: WardrobeItemSummary[],
    userProfile?: { preferredAesthetics: string[]; favoriteColors: string[] },
  ): Promise<{ reply: string; suggestions: string[]; provider: string; model: string }> {
    const wardrobeStr = wardrobeContext.slice(0, 20).map((w) =>
      `- ${w.name} (${w.category}, ${w.colors.join('/')})`
    ).join('\n');

    const systemPrompt = `You are ClosetAI, a personal wardrobe stylist assistant. You help users style their existing clothes.

User's wardrobe:
${wardrobeStr || 'No items added yet.'}
${userProfile ? `Preferred aesthetics: ${userProfile.preferredAesthetics.join(', ')}\nFavourite colors: ${userProfile.favoriteColors.join(', ')}` : ''}

Rules:
- Only suggest items from the user's wardrobe above
- Be concise and friendly
- If asked about missing items, suggest what to add
- Never suggest buying specific products
- Respond with JSON: {"reply": "your response", "suggestions": ["follow-up question 1", "follow-up question 2", "follow-up question 3"]}`;

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const raw = await openAIChat(this.apiKey, openaiMessages);
    const parsed = JSON.parse(raw) as { reply?: string; suggestions?: string[] };

    return {
      reply: typeof parsed.reply === 'string' ? parsed.reply : 'I can help you style your wardrobe!',
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 4) : [],
      provider: this.name,
      model: this.model,
    };
  }
}

export function createOpenAIProvider(apiKey: string): OpenAIProvider {
  logger.info('AI: Using OpenAI GPT-4o provider');
  return new OpenAIProvider(apiKey);
}
