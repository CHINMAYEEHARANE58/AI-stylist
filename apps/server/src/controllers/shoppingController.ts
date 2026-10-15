import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { categoryGroup, scoreProduct, type ShoppingSignals } from '../services/shoppingRecommendations';
import { normalizedMerchantHosts, presentOffers, primaryCurrentOffer, type StoredOffer } from '../services/catalogOffers';
import { configuredCatalogAdapter } from '../services/catalogProvider';
import { syncProductOffers } from '../services/syncProductOffers';

const listSchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  store: z.string().trim().max(100).optional(),
  sort: z.enum(['relevance', 'newest']).default('relevance'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(12),
}).strict();
const itemSchema = z.object({ catalogItemId: z.string().cuid() }).strict();
const removeSchema = z.union([
  itemSchema,
  z.object({ wishlistItemId: z.string().cuid() }).strict(),
]);
const sampleAllowed = env.NODE_ENV === 'development';
const eligibleProduct = { isActive: true, ...(sampleAllowed ? {} : { isSample: false }) };
const allowedMerchantHosts = normalizedMerchantHosts(env.SHOPPING_ALLOWED_MERCHANT_HOSTS);
const offerOptions = { allowedHosts: allowedMerchantHosts, maxAgeMinutes: env.SHOPPING_OFFER_MAX_AGE_MINUTES };

function authenticatedUserId(req: Request): string {
  if (!req.user) { throw new AppError('Authentication required.', 401); }
  return req.user.id;
}

function missingCategories(value: unknown): string[] {
  if (!Array.isArray(value)) {return [];}
  return value.flatMap((entry) => entry && typeof entry === 'object' &&
    'category' in entry && typeof entry.category === 'string' ? [entry.category] : []);
}

async function userSignals(userId: string): Promise<ShoppingSignals> {
  const [wardrobe, inspirations, preferences, outfits] = await Promise.all([
    prisma.clothingItem.findMany({ where: { userId, archived: false }, select: { category: true, colors: true } }),
    prisma.inspirationMatch.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20,
      select: { missingItems: true } }),
    prisma.userPreference.findUnique({ where: { userId }, select: { preferredAesthetics: true, favoriteColors: true,
      preferredCategories: true, preferredOccasions: true, styleDislikes: true,
      budgetCurrency: true, budgetMax: true } }),
    prisma.outfit.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20,
      select: { occasion: true } }),
  ]);
  return {
    wardrobeCategories: wardrobe.map((item) => item.category),
    wardrobeColors: wardrobe.flatMap((item) => item.colors),
    missingInspirationCategories: inspirations.flatMap((match) => missingCategories(match.missingItems)),
    preferredAesthetics: preferences?.preferredAesthetics ?? [],
    favoriteColors: preferences?.favoriteColors ?? [],
    preferredCategories: preferences?.preferredCategories ?? [],
    styleDislikes: preferences?.styleDislikes ?? [],
    budgetCurrency: preferences?.budgetCurrency ?? null,
    budgetMax: preferences?.budgetMax ? Number(preferences.budgetMax) : null,
    requestedOccasions: [...(preferences?.preferredOccasions ?? []),
      ...outfits.flatMap((outfit) => outfit.occasion ? [outfit.occasion] : [])],
  };
}

export async function refreshShoppingRecommendationsForUser(userId: string): Promise<void> {
  const [products, signals] = await Promise.all([
    prisma.product.findMany({ where: eligibleProduct, select: { id: true, name: true, brand: true,
      category: true, imageUrl: true, attributes: true, offers: true } }),
    userSignals(userId),
  ]);
  for (const product of products) {
    const currentOffers = presentOffers(product.offers, offerOptions)
      .filter((offer) => offer.freshness === 'fresh' && offer.canBuy)
      .map(({ price, currency }) => ({ price, currency }));
    const scored = scoreProduct({ ...product, currentOffers }, signals);
    await prisma.shoppingRecommendation.upsert({
      where: { userId_productId: { userId, productId: product.id } },
      create: { userId, productId: product.id, title: product.name, brand: product.brand,
        category: product.category, imageUrl: product.imageUrl, reason: scored.reason,
        similarity: scored.relevance, signals: scored.matchedSignals },
      update: { title: product.name, brand: product.brand, category: product.category,
        imageUrl: product.imageUrl, reason: scored.reason, similarity: scored.relevance,
        signals: scored.matchedSignals },
    });
  }
}

function presentRecommendation(rec: { id: string; title: string; brand: string | null; category: string | null;
  imageUrl: string | null; reason: string | null; similarity: number | null; signals: unknown;
  wishlistItems: Array<{ id: string }>; product: { id: string; name: string; brand: string | null;
    category: string | null; imageUrl: string | null; isSample: boolean; isActive: boolean;
    offers: StoredOffer[] } | null }) {
  const product = rec.product;
  if (!product) {
    return { id: rec.id, title: rec.title, brand: rec.brand, category: rec.category,
      imageUrl: rec.imageUrl, reason: rec.reason, relevance: rec.similarity, signals: rec.signals,
      isSample: false, available: false, wishlisted: rec.wishlistItems.length > 0,
      price: null, originalPrice: null, currency: null, store: null, url: null, offers: [] };
  }
  const offers = presentOffers(product.offers, offerOptions);
  const priced = primaryCurrentOffer(offers);
  return { id: product.id, title: product.name, brand: product.brand, category: product.category,
    imageUrl: product.imageUrl, reason: rec.reason, relevance: rec.similarity, signals: rec.signals,
    isSample: product.isSample, available: product.isActive, wishlisted: rec.wishlistItems.length > 0,
    price: priced?.price ?? null, originalPrice: null,
    currency: priced?.currency ?? null, store: priced?.store ?? null, url: priced?.url ?? null,
    offers };
}

export async function getShoppingRecommendations(req: Request, res: Response): Promise<void> {
  const userId = authenticatedUserId(req);
  const query = listSchema.parse(req.query);
  if (!await prisma.shoppingRecommendation.count({ where: { userId, productId: { not: null } } })) {
    await refreshShoppingRecommendationsForUser(userId);
  }
  const categories = query.category?.split(',').map((value) => categoryGroup(value.trim())).filter(Boolean) ?? [];
  const stores = query.store?.split(',').map((value) => value.trim()).filter(Boolean) ?? [];
  const offerCutoff = new Date(Date.now() - env.SHOPPING_OFFER_MAX_AGE_MINUTES * 60_000);
  const where = { userId, similarity: { gt: 0 }, product: { ...eligibleProduct,
    AND: [
      ...(categories.length ? [{ OR: categories.map((value) => ({ category: { equals: value, mode: 'insensitive' as const } })) }] : []),
      ...(query.search ? [{ OR: [
      { name: { contains: query.search, mode: 'insensitive' as const } },
      { brand: { contains: query.search, mode: 'insensitive' as const } },
      { category: { contains: query.search, mode: 'insensitive' as const } },
      ] }] : []),
    ],
    ...(stores.length ? { offers: { some: { AND: [
      { OR: stores.map((value) => ({ retailer: { equals: value, mode: 'insensitive' as const } })) },
      { observedAt: { gte: offerCutoff }, provider: { not: 'legacy' } },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    ] } } } : {}),
  } };
  const [total, rows] = await Promise.all([
    prisma.shoppingRecommendation.count({ where }),
    prisma.shoppingRecommendation.findMany({ where, include: { product: { include: { offers: true } },
      wishlistItems: { where: { userId }, select: { id: true } } },
      orderBy: query.sort === 'newest' ? { createdAt: 'desc' } : [{ similarity: 'desc' }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.perPage, take: query.perPage }),
  ]);
  ApiResponse.paginated(res, rows.map(presentRecommendation).filter((item) => item !== null),
    { page: query.page, perPage: query.perPage, total, totalPages: Math.ceil(total / query.perPage) });
}

export async function refreshShoppingRecommendations(req: Request, res: Response): Promise<void> {
  await refreshShoppingRecommendationsForUser(authenticatedUserId(req));
  ApiResponse.success(res, { refreshed: true }, 'Recommendations refreshed from your saved wardrobe and style signals.');
}

export async function getPriceComparisons(req: Request, res: Response): Promise<void> {
  const id = z.string().cuid().parse(req.params['id']);
  const product = await prisma.product.findFirst({ where: { id, ...(sampleAllowed ? {} : { isSample: false }) },
    include: { offers: true } });
  if (!product) {throw new AppError('Product not found.', 404);}
  ApiResponse.success(res, { product: { id: product.id, title: product.name, brand: product.brand,
    imageUrl: product.imageUrl, isSample: product.isSample },
  comparisons: presentOffers(product.offers, offerOptions) });
}

export async function getProductDetails(req: Request, res: Response): Promise<void> {
  const id = z.string().cuid().parse(req.params['id']);
  const product = await prisma.product.findFirst({ where: { id, ...(sampleAllowed ? {} : { isSample: false }) },
    include: { offers: true } });
  if (!product) { throw new AppError('Product not found.', 404); }
  const offers = presentOffers(product.offers, offerOptions);
  const adapter = configuredCatalogAdapter();
  ApiResponse.success(res, { id: product.id, name: product.name, brand: product.brand,
    category: product.category, description: product.description, imageUrl: product.imageUrl,
    attributes: product.attributes, isSample: product.isSample, available: product.isActive,
    updatedAt: product.updatedAt, offers,
    canRefresh: Boolean(adapter && !product.isSample && product.isActive &&
      product.source === adapter.id && product.sourceProductId) });
}

export async function refreshProductOffers(req: Request, res: Response): Promise<void> {
  authenticatedUserId(req);
  const id = z.string().cuid().parse(req.params['id']);
  const result = await syncProductOffers(id);
  ApiResponse.success(res, result, 'Offer observations refreshed from the authorized provider.');
}

export async function addToWishlist(req: Request, res: Response): Promise<void> {
  const userId = authenticatedUserId(req);
  const { catalogItemId } = itemSchema.parse(req.body);
  const product = await prisma.product.findFirst({ where: { id: catalogItemId, ...eligibleProduct } });
  if (!product) {throw new AppError('Product not found or unavailable.', 404);}
  let rec = await prisma.shoppingRecommendation.findUnique({ where: { userId_productId: { userId, productId: product.id } } });
  if (!rec) {
    await refreshShoppingRecommendationsForUser(userId);
    rec = await prisma.shoppingRecommendation.findUnique({ where: { userId_productId: { userId, productId: product.id } } });
  }
  if (!rec) {throw new AppError('Recommendation unavailable.', 404);}
  await prisma.wishlistItem.upsert({
    where: { userId_shoppingRecommendationId: { userId, shoppingRecommendationId: rec.id } },
    create: { userId, shoppingRecommendationId: rec.id }, update: {},
  });
  ApiResponse.created(res, { wishlisted: true, itemId: product.id }, 'Added to wishlist.');
}

export async function removeFromWishlist(req: Request, res: Response): Promise<void> {
  const userId = authenticatedUserId(req);
  const target = removeSchema.parse(req.body);
  await prisma.wishlistItem.deleteMany({ where: 'wishlistItemId' in target
    ? { id: target.wishlistItemId, userId }
    : { userId, recommendation: { userId, productId: target.catalogItemId } } });
  ApiResponse.noContent(res);
}

export async function getWishlist(req: Request, res: Response): Promise<void> {
  const userId = authenticatedUserId(req);
  const rows = await prisma.wishlistItem.findMany({ where: { userId },
    include: { recommendation: { include: { product: { include: { offers: true } },
      wishlistItems: { where: { userId }, select: { id: true } } } } }, orderBy: { createdAt: 'desc' } });
  ApiResponse.success(res, rows.map((row) => ({ id: row.id, createdAt: row.createdAt,
    item: presentRecommendation(row.recommendation) })));
}
