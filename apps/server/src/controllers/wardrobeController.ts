import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';

/** Extract a single string param safely */
function param(req: Request, key: string): string {
  const v = req.params[key];
  if (!v || Array.isArray(v)) throw new Error(`Missing param: ${key}`);
  return v;
}
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { uploadImage, deleteFromCloudinary } from '../services/imageService';
import { getAIProvider } from '../services/ai/index';

// ── Validation schemas ─────────────────────────────────────────────────

const createSchema = z.object({
  name:        z.string().min(1).max(160).trim(),
  imageUrl:    z.string().url().optional(),
  category:    z.string().min(1).max(80).trim(),
  subcategory: z.string().max(80).trim().optional(),
  colors:      z.array(z.string().max(60)).max(8).default([]),
  pattern:     z.string().max(80).trim().optional(),
  material:    z.string().max(80).trim().optional(),
  seasons:     z.array(z.string().max(40)).max(5).default([]),
  occasions:   z.array(z.string().max(60)).max(10).default([]),
  aesthetics:  z.array(z.string().max(60)).max(8).default([]),
  brand:       z.string().max(100).trim().optional(),
  notes:       z.string().max(1000).trim().optional(),
  sleeveStyle: z.string().max(80).trim().optional(),
  favorite:    z.boolean().default(false),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  perPage:   z.coerce.number().int().min(1).max(100).default(24),
  search:    z.string().max(200).optional(),
  category:  z.string().optional(),
  season:    z.string().optional(),
  occasion:  z.string().optional(),
  aesthetic: z.string().optional(),
  favorite:  z.enum(['true', 'false']).optional(),
  archived:  z.enum(['true', 'false']).optional(),
  sortBy:    z.enum(['createdAt', 'name', 'category', 'brand']).default('createdAt'),
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

  const where: Record<string, unknown> = {
    userId,
    archived: query.archived === 'true',
  };

  if (query.search) {
    where['OR'] = [
      { name:  { contains: query.search, mode: 'insensitive' } },
      { brand: { contains: query.search, mode: 'insensitive' } },
      { colors: { has: query.search } },
    ];
  }
  if (query.category)  where['category']          = { equals: query.category, mode: 'insensitive' };
  if (query.season)    where['seasons']            = { has: query.season };
  if (query.occasion)  where['occasions']          = { has: query.occasion };
  if (query.aesthetic) where['aesthetics']         = { has: query.aesthetic };
  if (query.favorite !== undefined) where['favorite'] = query.favorite === 'true';

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
  });
  if (!item) throw new AppError('Item not found.', 404);
  ApiResponse.success(res, item);
}

export async function createWardrobeItem(req: Request, res: Response): Promise<void> {
  const userId     = req.user!.id;
  const wardrobeId = await ensureWardrobe(userId);
  const data       = createSchema.parse(req.body);

  let imageUrl = data.imageUrl ?? 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600&q=80';
  let imageProviderId: string | undefined;

  // Handle file upload if present
  if (req.file) {
    const result = await uploadImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      userId,
      'wardrobe',
    );
    imageUrl = result.url;
    imageProviderId = result.providerId;
  }

  const item = await prisma.clothingItem.create({
    data: {
      userId,
      wardrobeId,
      name:        data.name,
      imageUrl,
      imageProviderId,
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
      favorite:    data.favorite,
    },
  });

  ApiResponse.created(res, item, 'Wardrobe item added.');
}

export async function updateWardrobeItem(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const data   = updateSchema.parse(req.body);

  const existing = await prisma.clothingItem.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new AppError('Item not found.', 404);

  const item = await prisma.clothingItem.update({
    where: { id },
    data: { ...data },
  });

  ApiResponse.success(res, item, 'Item updated.');
}

export async function deleteWardrobeItem(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const item = await prisma.clothingItem.findFirst({
    where: { id, userId },
    select: { id: true, imageProviderId: true },
  });
  if (!item) throw new AppError('Item not found.', 404);

  await prisma.clothingItem.delete({ where: { id: item.id } });

  // Clean up cloud image
  if (item.imageProviderId) {
    void deleteFromCloudinary(item.imageProviderId);
  }

  ApiResponse.noContent(res);
}

export async function toggleFavorite(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const item = await prisma.clothingItem.findFirst({
    where: { id, userId },
    select: { id: true, favorite: true },
  });
  if (!item) throw new AppError('Item not found.', 404);

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
  if (!item) throw new AppError('Item not found.', 404);

  const updated = await prisma.clothingItem.update({
    where: { id: item.id },
    data: { archived: !item.archived },
  });
  ApiResponse.success(res, updated, updated.archived ? 'Item archived.' : 'Item restored.');
}

export async function analyzeWardrobeImage(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new AppError('No image file provided.', 422);

  const userId = req.user!.id;

  // Upload first
  const uploaded = await uploadImage(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype,
    req.file.size,
    userId,
    'wardrobe',
  );

  const ai = getAIProvider();
  const analysis = await ai.analyzeClothingImage(uploaded.url);

  ApiResponse.success(res, {
    imageUrl:    uploaded.url,
    providerId:  uploaded.providerId,
    provider:    uploaded.provider,
    analysis,
  }, 'Image analysed.');
}

export async function getWardrobeSummary(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const items = await prisma.clothingItem.findMany({
    where: { userId, archived: false },
    select: { id: true, name: true, category: true, colors: true, seasons: true, occasions: true, aesthetics: true, pattern: true, material: true },
  });

  const categories: Record<string, number> = {};
  const colors: Record<string, number> = {};

  for (const item of items) {
    categories[item.category] = (categories[item.category] ?? 0) + 1;
    for (const c of item.colors) colors[c] = (colors[c] ?? 0) + 1;
  }

  ApiResponse.success(res, {
    total: items.length,
    categories: Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value })),
    colors: Object.entries(colors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value })),
  });
}
