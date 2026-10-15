import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { getAIProvider } from '../services/ai/index';
import type { WardrobeItemSummary } from '../services/ai/types';
import { keepEligibleOutfits } from '../services/ai/outfitGeneration';
import { keepEligibleStyleLooks, styleItemResultSchema } from '../services/ai/styleItemGeneration';
import { getWeatherStylingContext } from '../services/weatherService';

function param(req: Request, key: string): string {
  const v = req.params[key];
  if (!v || Array.isArray(v)) {throw new Error(`Missing param: ${key}`);}
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
  eventId: z.string().cuid().optional(),
  useWeather: z.boolean().optional(),
}).strict();

const saveOutfitSchema = z.object({
  title:        z.string().trim().min(1).max(160),
  occasion:     z.string().max(80).optional(),
  aesthetic:    z.string().max(100).optional(),
  season:       z.string().max(80).optional(),
  weather:      z.string().max(160).optional(),
  explanation:  z.string().max(2000).optional(),
  clothingItemIds: z.array(z.string().trim().min(1).max(120)).min(1).max(20)
    .refine((ids) => new Set(ids).size === ids.length, 'Outfit item IDs must be unique.'),
  slots:        z.record(z.string()).optional(),
  collection:   z.string().trim().min(1).max(100).optional(),
  source:       z.enum(['MANUAL', 'AI_GENERATED', 'INSPIRATION_MATCH']).default('MANUAL'),
  provider:     z.string().max(80).optional(),
  providerModel:z.string().max(120).optional(),
}).strict();

const styleItemSchema = z.object({
  itemId: z.string().trim().min(1).max(120),
  aesthetics: z.array(z.string().trim().min(1).max(100)).max(4).default([]),
  occasion: z.string().trim().min(1).max(80).optional(),
  season: z.string().trim().min(1).max(80).optional(),
}).strict();

const listSavedSchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  perPage:    z.coerce.number().int().min(1).max(50).default(20),
  search:     z.string().trim().max(160).optional(),
  collection: z.string().trim().min(1).max(100).optional(),
  occasion:   z.string().trim().min(1).max(80).optional(),
  aesthetic:  z.string().trim().min(1).max(100).optional(),
  favorite:   z.enum(['true', 'false']).optional(),
  sortBy:     z.enum(['savedAt', 'title', 'updatedAt']).default('savedAt'),
  sortDir:    z.enum(['asc', 'desc']).default('desc'),
}).strict();

const updateSavedSchema = z.object({
  title:      z.string().trim().min(1).max(160).optional(),
  notes:      z.string().trim().max(1000).nullable().optional(),
  collection: z.string().trim().min(1).max(100).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide a change to save.');

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
  const event = input.eventId ? await prisma.calendarEvent.findFirst({
    where: { id: input.eventId, userId }, select: { id: true, title: true, description: true,
      eventType: true, startsAt: true, timeZone: true },
  }) : null;
  if (input.eventId && !event) {throw new AppError('Event not found.', 404);}
  if (event && event.startsAt < new Date()) {throw new AppError('Choose an upcoming event for outfit suggestions.', 422);}
  const wardrobe = await getUserWardrobeForAI(userId);

  if (wardrobe.length < 2) {
    ApiResponse.success(res, { outfits: [], minimumItems: 2 }, 'Add at least two wardrobe items to generate a complete outfit.');
    return;
  }

  // Validate anchorItemId belongs to user
  if (input.anchorItemId) {
    const anchorItem = wardrobe.find((w) => w.id === input.anchorItemId);
    if (!anchorItem) {throw new AppError('Anchor item not found in your wardrobe.', 404);}
  }

  const userPrefs = await prisma.userPreference.findUnique({
    where: { userId },
    select: { preferredAesthetics: true, favoriteColors: true, preferredCategories: true,
      preferredOccasions: true, fitPreferences: true, preferredSeasons: true, styleDislikes: true,
      weatherCity: true },
  });
  const effectiveInput = { ...input, occasion: input.occasion ?? event?.eventType ?? undefined,
    notes: input.notes ?? (event ? `${event.title}. ${event.description ?? ''}`.trim().slice(0, 500) : undefined) };
  const eligibleWardrobe = wardrobe.filter((item) => matchesGenerationFilters(item, effectiveInput)
    && !(userPrefs?.styleDislikes ?? []).some((dislike) => [item.name, item.category, ...item.colors,
      ...item.aesthetics].some((value) => value.toLowerCase().includes(dislike.toLowerCase()))));
  if (eligibleWardrobe.length < 2) {
    ApiResponse.success(res, { outfits: [], minimumItems: 2 }, 'Not enough wardrobe items match those filters. Adjust a filter or add more items.');
    return;
  }
  if (input.anchorItemId && !eligibleWardrobe.some((item) => item.id === input.anchorItemId)) {
    throw new AppError('The selected anchor item does not match the current filters.', 422);
  }

  const weather = (input.useWeather || event) ? await getWeatherStylingContext(userPrefs?.weatherCity,
    event?.startsAt, event?.timeZone) : { available: false as const, reason: 'Weather was not requested.' };

  const ai = getAIProvider();
  const result = await ai.generateOutfits({
    ...effectiveInput,
    weather: weather.available
      ? `${weather.temperatureC}°C, ${weather.condition}, ${weather.precipitationMm}mm precipitation; ${weather.stylingTip}`
      : input.weather,
    wardrobeItems: eligibleWardrobe,
    userProfile: userPrefs
      ? { preferredAesthetics: userPrefs.preferredAesthetics, favoriteColors: userPrefs.favoriteColors,
        preferredCategories: userPrefs.preferredCategories, preferredOccasions: userPrefs.preferredOccasions,
        fitPreferences: userPrefs.fitPreferences, preferredSeasons: userPrefs.preferredSeasons,
        styleDislikes: userPrefs.styleDislikes }
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
    ApiResponse.success(res, { outfits: [], provider: result.provider, model: result.model, weather }, 'No complete outfit could be created from your available items. Try regenerating or change the filters.');
    return;
  }

  ApiResponse.success(res, { outfits: outfitsWithItems, provider: result.provider, model: result.model, weather }, 'Outfits generated. Review one and save it if you want to keep it.');
}

export async function styleSingleItem(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const input = styleItemSchema.parse(req.body);

  const item = await prisma.clothingItem.findFirst({
    where: { id: input.itemId, userId, archived: false },
    select: { id: true, name: true, category: true, colors: true, seasons: true, occasions: true, aesthetics: true, pattern: true, material: true },
  });
  if (!item) {
    throw new AppError('Item not found in your available wardrobe.', 404);
  }

  const candidateItems = await prisma.clothingItem.findMany({
    where: { userId, archived: false, id: { not: item.id } },
    select: { id: true, name: true, category: true, colors: true, seasons: true, occasions: true, aesthetics: true, pattern: true, material: true },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  const matches = (values: string[], requested?: string, includeAllSeason = false) => !requested || values.length === 0
    || values.some((value) => value.toLowerCase() === requested.toLowerCase()
      || (includeAllSeason && value.toLowerCase() === 'all season'));
  const companions = candidateItems
    .filter((candidate) => matches(candidate.seasons, input.season, true) && matches(candidate.occasions, input.occasion))
    .sort((a, b) => {
      const preferenceMatches = (values: string[]) => input.aesthetics.some((desired) => values.some((value) => value.toLowerCase() === desired.toLowerCase())) ? 1 : 0;
      return preferenceMatches(b.aesthetics) - preferenceMatches(a.aesthetics);
    })
    .slice(0, 59);

  if (companions.length === 0) {
    ApiResponse.success(res, { itemId: item.id, itemName: item.name, looks: [] },
      'No suitable companion pieces are available. Adjust the occasion or season, or add more items to your wardrobe.');
    return;
  }

  const wardrobe: WardrobeItemSummary[] = [item, ...companions].map((piece) => ({
    ...piece,
    pattern: piece.pattern ?? undefined,
    material: piece.material ?? undefined,
  }));
  const ai = getAIProvider();

  const result = await ai.styleThisItem(wardrobe[0], wardrobe, input);
  const parsed = styleItemResultSchema.safeParse({ looks: result.looks });
  if (!parsed.success) {
    throw new AppError('The AI provider returned invalid looks. Please try again.', 502, true, 'AI_MALFORMED_STYLE_RESPONSE');
  }

  // Query fresh records after inference. A deleted, archived, or foreign item
  // invalidates the entire proposed look, including if it is the anchor.
  const allIds = [...new Set(parsed.data.looks.flatMap((look) => look.clothingItemIds))];
  const currentItems = await prisma.clothingItem.findMany({ where: { id: { in: allIds }, userId, archived: false } });
  const itemMap = new Map(currentItems.map((record) => [record.id, record]));
  if (!itemMap.has(item.id)) {
    throw new AppError('The selected item is no longer available.', 404);
  }
  const offeredIds = new Set(wardrobe.map((piece) => piece.id));
  const currentEligibleIds = new Set([...offeredIds].filter((id) => itemMap.has(id)));
  const safeLooks = keepEligibleStyleLooks(parsed.data.looks, item.id, currentEligibleIds);
  if (safeLooks.length === 0) {
    throw new AppError('The AI could not create a valid look from your available items. Please regenerate.', 502, true, 'AI_INVALID_ITEM_IDS');
  }

  const looksWithItems = safeLooks.map((l) => ({
    ...l,
    clothingItems: l.clothingItemIds.map((id) => itemMap.get(id)),
  }));

  await prisma.aIStylingHistory.create({
    data: {
      userId,
      requestType: 'style_item',
      input: input as object,
      output: { itemId: item.id, looks: safeLooks } as object,
      provider: result.provider,
      model: result.model,
    },
  });

  ApiResponse.success(res, { itemId: item.id, itemName: item.name, provider: result.provider, model: result.model, looks: looksWithItems },
    'Styling looks generated. Save a look if you want to keep it.');
}

export async function saveOutfit(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const data   = saveOutfitSchema.parse(req.body);

  // Save the outfit, immutable item names/categories, and its collection link
  // atomically. The database FK still rejects an item concurrently deleted
  // between ownership validation and insertion.
  const outfit = await prisma.$transaction(async (tx) => {
    const items = await tx.clothingItem.findMany({
      where: { id: { in: data.clothingItemIds }, userId, archived: false },
      select: { id: true, name: true, category: true },
    });
    const itemMap = new Map(items.map((item) => [item.id, item]));
    if (data.clothingItemIds.some((id) => !itemMap.has(id))) {
      throw new AppError('One or more items not found in your wardrobe.', 403);
    }

    const created = await tx.outfit.create({
      data: {
        userId,
        title: data.title,
        occasion: data.occasion,
        aesthetic: data.aesthetic,
        season: data.season,
        weather: data.weather,
        explanation: data.explanation,
        source: data.source,
        provider: data.source === 'AI_GENERATED' ? data.provider : undefined,
        providerModel: data.source === 'AI_GENERATED' ? data.providerModel : undefined,
        items: {
          create: data.clothingItemIds.map((id, position) => ({
            clothingItemId: id,
            snapshotName: itemMap.get(id)!.name,
            snapshotCategory: itemMap.get(id)!.category,
            slot: data.slots?.[id],
            position,
          })),
        },
      },
      include: { items: { include: { clothingItem: true }, orderBy: { position: 'asc' } } },
    });
    await tx.savedOutfit.create({ data: { userId, outfitId: created.id, collection: data.collection } });
    return created;
  }).catch((error: unknown) => {
    if ((error as { code?: string }).code === 'P2003') {
      throw new AppError('One or more wardrobe items are no longer available. Refresh and try again.', 409);
    }
    throw error;
  });

  ApiResponse.created(res, outfit, 'Outfit saved.');
}

export async function getSavedOutfits(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const query  = listSavedSchema.parse(req.query);

  const outfitFilter: Prisma.OutfitWhereInput = { userId };
  if (query.occasion) {outfitFilter.occasion = { equals: query.occasion, mode: 'insensitive' };}
  if (query.aesthetic) {outfitFilter.aesthetic = { equals: query.aesthetic, mode: 'insensitive' };}
  if (query.favorite) {outfitFilter.favorite = query.favorite === 'true';}
  const where: Prisma.SavedOutfitWhereInput = { userId, outfit: { is: outfitFilter } };
  if (query.collection) {where.collection = query.collection;}
  if (query.search) {
    where.OR = [
      { outfit: { is: { title: { contains: query.search, mode: 'insensitive' } } } },
      { outfit: { is: { explanation: { contains: query.search, mode: 'insensitive' } } } },
      { outfit: { is: { items: { some: { snapshotName: { contains: query.search, mode: 'insensitive' } } } } } },
      { notes: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  const orderBy: Prisma.SavedOutfitOrderByWithRelationInput = query.sortBy === 'title'
    ? { outfit: { title: query.sortDir } }
    : query.sortBy === 'updatedAt'
      ? { outfit: { updatedAt: query.sortDir } }
      : { createdAt: query.sortDir };

  const [total, saved] = await Promise.all([
    prisma.savedOutfit.count({ where }),
    prisma.savedOutfit.findMany({
      where,
      orderBy,
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

export async function getSavedOutfit(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const saved = await prisma.savedOutfit.findFirst({
    where: { id, userId, outfit: { userId } },
    include: { outfit: { include: { items: { include: { clothingItem: true }, orderBy: { position: 'asc' } } } } },
  });
  if (!saved) {throw new AppError('Saved outfit not found.', 404);}
  ApiResponse.success(res, saved);
}

export async function updateSavedOutfit(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const input = updateSavedSchema.parse(req.body);
  const saved = await prisma.$transaction(async (tx) => {
    const existing = await tx.savedOutfit.findFirst({
      where: { id, userId, outfit: { userId } },
      select: { id: true, outfitId: true },
    });
    if (!existing) {throw new AppError('Saved outfit not found.', 404);}
    if (input.title !== undefined) {
      await tx.outfit.update({ where: { id: existing.outfitId }, data: { title: input.title } });
    }
    await tx.savedOutfit.update({
      where: { id: existing.id },
      data: { notes: input.notes, collection: input.collection },
    });
    return tx.savedOutfit.findUniqueOrThrow({
      where: { id: existing.id },
      include: { outfit: { include: { items: { include: { clothingItem: true }, orderBy: { position: 'asc' } } } } },
    });
  });
  ApiResponse.success(res, saved, 'Saved outfit updated.');
}

export async function deleteSavedOutfit(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const existing = await prisma.savedOutfit.findFirst({
    where: { id, userId, outfit: { userId } },
  });
  if (!existing) {throw new AppError('Saved outfit not found.', 404);}

  await prisma.savedOutfit.delete({ where: { id: existing.id } });
  ApiResponse.noContent(res);
}

export async function toggleOutfitFavorite(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const outfitId = param(req, 'id');

  // Ensure user owns the outfit via savedOutfit
  const saved = await prisma.savedOutfit.findFirst({
    where: { outfitId, userId, outfit: { userId } },
  });
  if (!saved) {throw new AppError('Outfit not found.', 404);}

  const outfit = await prisma.outfit.findUnique({ where: { id: outfitId }, select: { favorite: true } });
  if (!outfit) {throw new AppError('Outfit not found.', 404);}

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
    where: { userId, outfit: { userId }, collection: { not: null } },
    _count: { id: true },
  });

  ApiResponse.success(res, collections.map((c) => ({
    name: c.collection,
    count: c._count.id,
  })));
}
