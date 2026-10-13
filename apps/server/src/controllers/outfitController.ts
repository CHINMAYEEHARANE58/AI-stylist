import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { getAIProvider } from '../services/ai/index';
import type { WardrobeItemSummary } from '../services/ai/types';
import { keepEligibleOutfits } from '../services/ai/outfitGeneration';

function param(req: Request, key: string): string {
  const v = req.params[key];
  if (!v || Array.isArray(v)) throw new Error(`Missing param: ${key}`);
  return v;
}

// ── Schemas ────────────────────────────────────────────────────────────

const generateSchema = z.object({
  occasion:     z.string().trim().min(1).max(80).optional(),
  aesthetic:    z.string().trim().min(1).max(100).optional(),
  colorPreference: z.string().trim().min(1).max(60).optional(),
  weather:      z.string().trim().min(1).max(160).optional(),
  mood:         z.string().trim().min(1).max(80).optional(),
  season:       z.string().trim().min(1).max(40).optional(),
  notes:        z.string().trim().min(1).max(500).optional(),
  anchorItemId: z.string().trim().min(1).max(120).optional(),
}).strict();

const saveOutfitSchema = z.object({
  title:        z.string().min(1).max(160),
  occasion:     z.string().max(80).optional(),
  aesthetic:    z.string().max(100).optional(),
  season:       z.string().max(80).optional(),
  weather:      z.string().max(160).optional(),
  explanation:  z.string().max(2000).optional(),
  clothingItemIds: z.array(z.string().trim().min(1).max(120)).min(1).max(20)
    .refine((ids) => new Set(ids).size === ids.length, 'Outfit item IDs must be unique.'),
  slots:        z.record(z.string()).optional(),
  collection:   z.string().max(100).optional(),
  source:       z.enum(['MANUAL', 'AI_GENERATED', 'INSPIRATION_MATCH']).default('MANUAL'),
  provider:     z.string().max(80).optional(),
  providerModel:z.string().max(120).optional(),
}).strict();

const styleItemSchema = z.object({
  itemId: z.string().cuid(),
});

const listSavedSchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  perPage:    z.coerce.number().int().min(1).max(50).default(20),
  collection: z.string().optional(),
  favorite:   z.enum(['true', 'false']).optional(),
});

// ── Helper ─────────────────────────────────────────────────────────────

async function getUserWardrobeForAI(userId: string): Promise<WardrobeItemSummary[]> {
  const items = await prisma.clothingItem.findMany({
    where: { userId, archived: false },
    select: {
      id: true, name: true, category: true, colors: true,
      seasons: true, occasions: true, aesthetics: true,
      pattern: true, material: true,
    },
    take: 60, // cap tokens sent to AI
  });
  return items.map((w) => ({
    id: w.id,
    name: w.name,
    category: w.category,
    colors: w.colors,
    seasons: w.seasons,
    occasions: w.occasions,
    aesthetics: w.aesthetics,
    pattern: w.pattern ?? undefined,
    material: w.material ?? undefined,
  }));
}

function matchesGenerationFilters(item: WardrobeItemSummary, input: z.infer<typeof generateSchema>): boolean {
  const matches = (values: string[], requested?: string, includeAllSeason = false) => !requested
    || values.length === 0
    || values.some((value) => value.toLowerCase() === requested.toLowerCase())
    || (includeAllSeason && values.some((value) => value.toLowerCase() === 'all season'));
  return matches(item.seasons, input.season, true)
    && matches(item.occasions, input.occasion)
    && matches(item.aesthetics, input.aesthetic)
    && matches(item.colors, input.colorPreference);
}

// ── Controllers ────────────────────────────────────────────────────────

export async function generateOutfitRecommendations(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const input  = generateSchema.parse(req.body);
  const wardrobe = await getUserWardrobeForAI(userId);

  if (wardrobe.length < 2) {
    ApiResponse.success(res, { outfits: [], minimumItems: 2 }, 'Add at least two wardrobe items to generate a complete outfit.');
    return;
  }

  // Validate anchorItemId belongs to user
  if (input.anchorItemId) {
    const anchorItem = wardrobe.find((w) => w.id === input.anchorItemId);
    if (!anchorItem) throw new AppError('Anchor item not found in your wardrobe.', 404);
  }

  const eligibleWardrobe = wardrobe.filter((item) => matchesGenerationFilters(item, input));
  if (eligibleWardrobe.length < 2) {
    ApiResponse.success(res, { outfits: [], minimumItems: 2 }, 'Not enough wardrobe items match those filters. Adjust a filter or add more items.');
    return;
  }
  if (input.anchorItemId && !eligibleWardrobe.some((item) => item.id === input.anchorItemId)) {
    throw new AppError('The selected anchor item does not match the current filters.', 422);
  }

  const userPrefs = await prisma.userPreference.findUnique({
    where: { userId },
    select: { preferredAesthetics: true, favoriteColors: true },
  });

  const ai = getAIProvider();
  const result = await ai.generateOutfits({
    ...input,
    wardrobeItems: eligibleWardrobe,
    userProfile: userPrefs
      ? { preferredAesthetics: userPrefs.preferredAesthetics, favoriteColors: userPrefs.favoriteColors }
      : undefined,
  });

  // Query current records again so a concurrent archive/delete can never leak
  // into a result. Candidates containing one invalid, foreign, or unavailable
  // item are rejected whole rather than shown as a partial outfit.
  const allIds = [...new Set(result.outfits.flatMap((o) => o.clothingItemIds))];
  const itemsById = allIds.length > 0
    ? await prisma.clothingItem.findMany({ where: { id: { in: allIds }, userId, archived: false } })
    : [];
  const itemMap = new Map(itemsById.map((i) => [i.id, i]));
  const eligibleIds = new Set(eligibleWardrobe.map((item) => item.id));
  const currentEligibleIds = new Set([...eligibleIds].filter((id) => itemMap.has(id)));
  const safeOutfits = keepEligibleOutfits(result.outfits, currentEligibleIds);

  const outfitsWithItems = safeOutfits.map((o) => ({
    ...o,
    clothingItems: o.clothingItemIds.map((id) => itemMap.get(id)),
  }));

  // Persist only the server-validated result, never raw provider IDs.
  await prisma.aIStylingHistory.create({
    data: {
      userId,
      requestType: 'outfit_generation',
      input: input as object,
      output: { outfits: safeOutfits } as object,
      provider: result.provider,
      model: result.model,
    },
  });

  if (outfitsWithItems.length === 0) {
    ApiResponse.success(res, { outfits: [], provider: result.provider, model: result.model }, 'No complete outfit could be created from your available items. Try regenerating or change the filters.');
    return;
  }

  ApiResponse.success(res, { outfits: outfitsWithItems, provider: result.provider, model: result.model }, 'Outfits generated. Review one and save it if you want to keep it.');
}

export async function styleSingleItem(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { itemId } = styleItemSchema.parse(req.body);

  // Verify ownership
  const item = await prisma.clothingItem.findFirst({
    where: { id: itemId, userId },
    select: { id: true, name: true, category: true, colors: true, seasons: true, occasions: true, aesthetics: true, pattern: true, material: true },
  });
  if (!item) throw new AppError('Item not found in your wardrobe.', 404);

  const wardrobe = await getUserWardrobeForAI(userId);
  const ai = getAIProvider();

  const result = await ai.styleThisItem(
    { id: item.id, name: item.name, category: item.category, colors: item.colors, seasons: item.seasons, occasions: item.occasions, aesthetics: item.aesthetics, pattern: item.pattern ?? undefined, material: item.material ?? undefined },
    wardrobe,
  );

  // Validate all returned IDs
  const validIds = new Set(wardrobe.map((w) => w.id));
  result.looks.forEach((look) => {
    look.clothingItemIds = look.clothingItemIds.filter((id) => validIds.has(id));
  });

  // Enrich with item data
  const allIds = [...new Set(result.looks.flatMap((l) => l.clothingItemIds))];
  const itemsById = allIds.length > 0
    ? await prisma.clothingItem.findMany({ where: { id: { in: allIds }, userId } })
    : [];
  const itemMap = new Map(itemsById.map((i) => [i.id, i]));

  const looksWithItems = result.looks.map((l) => ({
    ...l,
    clothingItems: l.clothingItemIds.map((id) => itemMap.get(id)).filter(Boolean),
  }));

  void prisma.aIStylingHistory.create({
    data: {
      userId,
      requestType: 'style_item',
      input: { itemId } as object,
      output: result as object,
      provider: result.provider,
      model: result.model,
    },
  });

  ApiResponse.success(res, { ...result, looks: looksWithItems }, 'Styling looks generated.');
}

export async function saveOutfit(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const data   = saveOutfitSchema.parse(req.body);

  // Verify all clothing items belong to user
  const items = await prisma.clothingItem.findMany({
    where: { id: { in: data.clothingItemIds }, userId, archived: false },
    select: { id: true },
  });
  const foundIds = new Set(items.map((i) => i.id));
  const unauthorized = data.clothingItemIds.filter((id) => !foundIds.has(id));
  if (unauthorized.length > 0) throw new AppError('One or more items not found in your wardrobe.', 403);

  const outfit = await prisma.outfit.create({
    data: {
      userId,
      title:       data.title,
      occasion:    data.occasion,
      aesthetic:   data.aesthetic,
      season:      data.season,
      weather:     data.weather,
      explanation: data.explanation,
      source:      data.source,
      provider:    data.source === 'AI_GENERATED' ? data.provider : undefined,
      providerModel: data.source === 'AI_GENERATED' ? data.providerModel : undefined,
      items: {
        create: data.clothingItemIds.map((id, idx) => ({
          clothingItemId: id,
          slot: data.slots?.[id],
          position: idx,
        })),
      },
    },
    include: { items: { include: { clothingItem: true } } },
  });

  // Auto-save it
  await prisma.savedOutfit.create({
    data: { userId, outfitId: outfit.id, collection: data.collection },
  });

  ApiResponse.created(res, outfit, 'Outfit saved.');
}

export async function getSavedOutfits(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const query  = listSavedSchema.parse(req.query);

  const where: Record<string, unknown> = { userId };
  if (query.collection) where['collection'] = query.collection;

  const [total, saved] = await Promise.all([
    prisma.savedOutfit.count({ where }),
    prisma.savedOutfit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
      include: {
        outfit: {
          include: {
            items: { include: { clothingItem: true }, orderBy: { position: 'asc' } },
          },
        },
      },
    }),
  ]);

  ApiResponse.paginated(res, saved, {
    page: query.page,
    perPage: query.perPage,
    total,
    totalPages: Math.ceil(total / query.perPage),
  });
}

export async function deleteSavedOutfit(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const existing = await prisma.savedOutfit.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new AppError('Saved outfit not found.', 404);

  await prisma.savedOutfit.delete({ where: { id: existing.id } });
  ApiResponse.noContent(res);
}

export async function toggleOutfitFavorite(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const outfitId = param(req, 'id');

  // Ensure user owns the outfit via savedOutfit
  const saved = await prisma.savedOutfit.findFirst({
    where: { outfitId, userId },
  });
  if (!saved) throw new AppError('Outfit not found.', 404);

  const outfit = await prisma.outfit.findUnique({ where: { id: outfitId }, select: { favorite: true } });
  if (!outfit) throw new AppError('Outfit not found.', 404);

  const updated = await prisma.outfit.update({
    where: { id: outfitId },
    data: { favorite: !outfit.favorite },
  });
  ApiResponse.success(res, updated, updated.favorite ? 'Marked as favourite.' : 'Removed from favourites.');
}

export async function getCollections(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const collections = await prisma.savedOutfit.groupBy({
    by: ['collection'],
    where: { userId, collection: { not: null } },
    _count: { id: true },
  });

  ApiResponse.success(res, collections.map((c) => ({
    name: c.collection,
    count: c._count.id,
  })));
}
