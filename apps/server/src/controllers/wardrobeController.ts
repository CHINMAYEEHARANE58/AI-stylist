import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';

/** Extract a single string param safely */
function param(req: Request, key: string): string {
  const v = req.params[key];
  if (!v || Array.isArray(v)) {throw new Error(`Missing param: ${key}`);}
  return v;
}
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { uploadImage, deleteFromCloudinary, inspectImageBuffer } from '../services/imageService';
import { getAIProvider } from '../services/ai/index';
import { clothingAnalysisSchema } from '../services/ai/clothingAnalysis';
import { env } from '../config/env';

// ── Validation schemas ─────────────────────────────────────────────────

function stringArray(max: number) {
  return z.preprocess((value) => {
    if (typeof value !== 'string') {return value;}
    try { return JSON.parse(value); } catch { return value; }
  }, z.array(z.string().trim().min(1).max(60)).max(max));
}

const optionalStringArray = stringArray(12).optional();

const createSchema = z.object({
  name:        z.string().min(1).max(160).trim(),
  category:    z.string().min(1).max(80).trim(),
  subcategory: z.string().max(80).trim().optional(),
  colors:      stringArray(8).default([]),
  pattern:     z.string().max(80).trim().optional(),
  material:    z.string().max(80).trim().optional(),
  seasons:     stringArray(5).default([]),
  occasions:   stringArray(10).default([]),
  aesthetics:  stringArray(8).default([]),
  brand:       z.string().max(100).trim().optional(),
  notes:       z.string().max(1000).trim().optional(),
  sleeveStyle: z.string().max(80).trim().optional(),
  fit:         z.string().max(80).trim().optional(),
  silhouette:  z.string().max(80).trim().optional(),
  description: z.string().max(500).trim().optional(),
  favorite:    z.boolean().default(false),
}).strict();

const updateSchema = createSchema.partial().extend({
  colors: optionalStringArray,
  seasons: optionalStringArray,
  occasions: optionalStringArray,
  aesthetics: optionalStringArray,
}).refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update.');

const listValues = z.preprocess((value) => {
  if (Array.isArray(value)) {return value.flatMap((entry) => typeof entry === 'string' ? entry.split(',') : []);}
  return typeof value === 'string' ? value.split(',') : [];
}, z.array(z.string().trim().min(1).max(80)).max(12));

const listQuerySchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  perPage:   z.coerce.number().int().min(1).max(100).default(24),
  search:    z.string().max(200).optional(),
  category:  listValues.optional(),
  subcategory: listValues.optional(),
  color: listValues.optional(),
  season:    listValues.optional(),
  occasion:  listValues.optional(),
  aesthetic: listValues.optional(),
  favorite:  z.enum(['true', 'false']).optional(),
  archived:  z.enum(['true', 'false']).optional(),
  sortBy:    z.enum(['createdAt', 'updatedAt', 'name', 'category', 'brand']).default('createdAt'),
  sortDir:   z.enum(['asc', 'desc']).default('desc'),
});

// ── Helper: ensure user has a wardrobe ───────────────────────────────

async function ensureWardrobe(userId: string): Promise<string> {
  let wardrobe = await prisma.wardrobe.findUnique({ where: { userId }, select: { id: true } });
  if (!wardrobe) {
    wardrobe = await prisma.wardrobe.create({ data: { userId } });
  }
  return wardrobe.id;
}

// ── Controllers ───────────────────────────────────────────────────────

export async function getWardrobe(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const query  = listQuerySchema.parse(req.query);

  const where: Prisma.ClothingItemWhereInput = {
    userId,
    archived: query.archived === 'true',
  };

  if (query.search) {
    where['OR'] = [
      { name:  { contains: query.search, mode: 'insensitive' } },
      { brand: { contains: query.search, mode: 'insensitive' } },
      { notes: { contains: query.search, mode: 'insensitive' } },
    ];
  }
  if (query.category?.length) {where.category = { in: query.category, mode: 'insensitive' };}
  if (query.subcategory?.length) {where.subcategory = { in: query.subcategory, mode: 'insensitive' };}
  if (query.color?.length) {where.colors = { hasSome: query.color };}
  if (query.season?.length) {where.seasons = { hasSome: query.season };}
  if (query.occasion?.length) {where.occasions = { hasSome: query.occasion };}
  if (query.aesthetic?.length) {where.aesthetics = { hasSome: query.aesthetic };}
  if (query.favorite !== undefined) {where.favorite = query.favorite === 'true';}

  const [total, items] = await Promise.all([
    prisma.clothingItem.count({ where }),
    prisma.clothingItem.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
  ]);

  ApiResponse.paginated(res, items, {
    page: query.page,
    perPage: query.perPage,
    total,
    totalPages: Math.ceil(total / query.perPage),
  });
}

export async function getWardrobeItem(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const item = await prisma.clothingItem.findFirst({
    where: { id, userId },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!item) {throw new AppError('Item not found.', 404);}
  ApiResponse.success(res, item);
}

export async function createWardrobeItem(req: Request, res: Response): Promise<void> {
  const userId     = req.user!.id;
  const wardrobeId = await ensureWardrobe(userId);
  const data       = createSchema.parse(req.body);

  let imageUrl = '/wardrobe-item-1.svg';
  let uploaded: Awaited<ReturnType<typeof uploadImage>> | undefined;

  // Handle file upload if present
  if (req.file) {
    uploaded = await uploadImage(req.file.buffer, userId, 'wardrobe');
    imageUrl = uploaded.url;
  }

  const item = await prisma.clothingItem.create({
    data: {
      userId,
      wardrobeId,
      name:        data.name,
      imageUrl,
      imageProviderId: uploaded?.providerId,
      category:    data.category,
      subcategory: data.subcategory,
      colors:      data.colors,
      pattern:     data.pattern,
      material:    data.material,
      seasons:     data.seasons,
      occasions:   data.occasions,
      aesthetics:  data.aesthetics,
      brand:       data.brand,
      notes:       data.notes,
      sleeveStyle: data.sleeveStyle,
      fit:         data.fit,
      silhouette:  data.silhouette,
      description: data.description,
      favorite:    data.favorite,
      images: uploaded ? { create: { url: uploaded.url, providerAssetId: uploaded.providerId, storageKey: uploaded.storageKey, contentType: uploaded.contentType, byteSize: uploaded.byteSize, width: uploaded.width, height: uploaded.height, sortOrder: 0 } } : undefined,
    },
  });

  ApiResponse.created(res, item, uploaded ? 'Wardrobe item added with a secure image upload.' : 'Wardrobe item added without an image.');
}

export async function updateWardrobeItem(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const data = Object.keys(req.body).length > 0 ? updateSchema.parse(req.body) : {};

  const existing = await prisma.clothingItem.findFirst({
    where: { id, userId },
    include: { images: { where: { sortOrder: 0 }, select: { id: true, providerAssetId: true } } },
  });
  if (!existing) {throw new AppError('Item not found.', 404);}

  let uploaded: Awaited<ReturnType<typeof uploadImage>> | undefined;
  if (req.file) uploaded = await uploadImage(req.file.buffer, userId, 'wardrobe');
  try {
    const item = await prisma.$transaction(async (tx) => {
      if (uploaded) {
        await tx.clothingImage.deleteMany({ where: { clothingItemId: id, sortOrder: 0 } });
      }
      return tx.clothingItem.update({
        where: { id },
        data: {
          ...data,
          ...(uploaded && { imageUrl: uploaded.url, imageProviderId: uploaded.providerId, images: { create: { url: uploaded.url, providerAssetId: uploaded.providerId, storageKey: uploaded.storageKey, contentType: uploaded.contentType, byteSize: uploaded.byteSize, width: uploaded.width, height: uploaded.height, sortOrder: 0 } } }),
        },
      });
    });
    if (uploaded && existing.images[0]?.providerAssetId) void deleteFromCloudinary(existing.images[0].providerAssetId);
    ApiResponse.success(res, item, uploaded ? 'Item and image updated.' : 'Item updated.');
  } catch (error) {
    if (uploaded) void deleteFromCloudinary(uploaded.providerId);
    throw error;
  }
}

export async function deleteWardrobeItem(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const item = await prisma.clothingItem.findFirst({
    where: { id, userId },
    include: { images: { select: { providerAssetId: true } } },
  });
  if (!item) {throw new AppError('Item not found.', 404);}

  await prisma.clothingItem.delete({ where: { id: item.id } });

  // Clean up cloud image
  for (const image of item.images) if (image.providerAssetId) void deleteFromCloudinary(image.providerAssetId);

  ApiResponse.noContent(res);
}

export async function deleteWardrobeImage(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const item = await prisma.clothingItem.findFirst({ where: { id, userId }, include: { images: { where: { sortOrder: 0 }, select: { providerAssetId: true } } } });
  if (!item) throw new AppError('Item not found.', 404);
  const updated = await prisma.$transaction(async (tx) => {
    await tx.clothingImage.deleteMany({ where: { clothingItemId: id, sortOrder: 0 } });
    return tx.clothingItem.update({ where: { id }, data: { imageUrl: '/wardrobe-item-1.svg', imageProviderId: null } });
  });
  if (item.images[0]?.providerAssetId) void deleteFromCloudinary(item.images[0].providerAssetId);
  ApiResponse.success(res, updated, 'Image removed.');
}

export async function toggleFavorite(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const item = await prisma.clothingItem.findFirst({
    where: { id, userId },
    select: { id: true, favorite: true },
  });
  if (!item) {throw new AppError('Item not found.', 404);}

  const updated = await prisma.clothingItem.update({
    where: { id: item.id },
    data: { favorite: !item.favorite },
  });
  ApiResponse.success(res, updated, updated.favorite ? 'Added to favourites.' : 'Removed from favourites.');
}

export async function toggleArchive(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const item = await prisma.clothingItem.findFirst({
    where: { id, userId },
    select: { id: true, archived: true },
  });
  if (!item) {throw new AppError('Item not found.', 404);}

  const updated = await prisma.clothingItem.update({
    where: { id: item.id },
    data: { archived: !item.archived },
  });
  ApiResponse.success(res, updated, updated.archived ? 'Item archived.' : 'Item restored.');
}

export async function analyzeWardrobeImage(req: Request, res: Response): Promise<void> {
  if (!req.file) {throw new AppError('No image file provided.', 422);}

  // Verify the actual bytes before an image reaches any provider. A data URL is
  // passed directly from this server, avoiding a public temporary upload.
  const metadata = inspectImageBuffer(req.file.buffer);
  const imageHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  const ai = getAIProvider();
  const now = new Date();
  const cached = await prisma.clothingAnalysisCache.findUnique({
    where: { imageHash_provider_model: { imageHash, provider: ai.name, model: ai.model } },
  });
  if (cached && cached.expiresAt > now) {
    const parsed = clothingAnalysisSchema.safeParse(cached.analysis);
    if (parsed.success) {
      ApiResponse.success(res, { analysis: parsed.data, provider: ai.name, model: ai.model, cached: true }, 'Image analysis loaded from cache.');
      return;
    }
    await prisma.clothingAnalysisCache.delete({ where: { id: cached.id } });
  }

  const imageDataUrl = `data:${metadata.contentType};base64,${req.file.buffer.toString('base64')}`;
  const analysis = clothingAnalysisSchema.parse(await ai.analyzeClothingImage(imageDataUrl));
  const expiresAt = new Date(now.getTime() + env.AI_ANALYSIS_CACHE_MINUTES * 60_000);
  await prisma.clothingAnalysisCache.upsert({
    where: { imageHash_provider_model: { imageHash, provider: ai.name, model: ai.model } },
    create: { imageHash, provider: ai.name, model: ai.model, analysis, expiresAt },
    update: { analysis, expiresAt },
  });

  ApiResponse.success(res, { analysis, provider: ai.name, model: ai.model, cached: false }, 'Image analysed. Review and edit the suggestions before saving.');
}

export async function getWardrobeSummary(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const items = await prisma.clothingItem.findMany({
    where: { userId, archived: false },
    select: { id: true, name: true, category: true, subcategory: true, colors: true, seasons: true, occasions: true, aesthetics: true, pattern: true, material: true },
  });

  const categories: Record<string, number> = {};
  const subcategories: Record<string, number> = {};
  const colors: Record<string, number> = {};
  const seasons: Record<string, number> = {};
  const occasions: Record<string, number> = {};
  const aesthetics: Record<string, number> = {};

  for (const item of items) {
    categories[item.category] = (categories[item.category] ?? 0) + 1;
    if (item.subcategory) {subcategories[item.subcategory] = (subcategories[item.subcategory] ?? 0) + 1;}
    for (const c of item.colors) {colors[c] = (colors[c] ?? 0) + 1;}
    for (const season of item.seasons) {seasons[season] = (seasons[season] ?? 0) + 1;}
    for (const occasion of item.occasions) {occasions[occasion] = (occasions[occasion] ?? 0) + 1;}
    for (const aesthetic of item.aesthetics) {aesthetics[aesthetic] = (aesthetics[aesthetic] ?? 0) + 1;}
  }

  ApiResponse.success(res, {
    total: items.length,
    categories: Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value })),
    subcategories: Object.entries(subcategories).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
    colors: Object.entries(colors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value })),
    seasons: Object.entries(seasons).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
    occasions: Object.entries(occasions).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
    aesthetics: Object.entries(aesthetics).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
  });
}
