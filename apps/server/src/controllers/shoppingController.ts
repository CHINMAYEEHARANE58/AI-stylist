import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';

// ── Static mock catalog ─────────────────────────────────────────────────
// In production these would come from retailer API adapters

const MOCK_CATALOG = [
  {
    id: 'shop-1', title: 'Neutral Leather Sneakers', price: 4299, originalPrice: 5499,
    rating: 4.7, reviewCount: 382, brand: 'Zara', category: 'shoes', similarity: 96,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
    offers: [
      { store: 'Zara', productUrl: '#', price: 4299, discount: 22, rating: 4.7, availability: 'In stock' },
      { store: 'Amazon', productUrl: '#', price: 4199, discount: 24, rating: 4.3, availability: 'In stock' },
      { store: 'Myntra', productUrl: '#', price: 4399, discount: 20, rating: 4.6, availability: 'In stock' },
    ],
  },
  {
    id: 'shop-2', title: 'Relaxed Linen Trousers', price: 2599, originalPrice: 3199,
    rating: 4.5, reviewCount: 218, brand: 'H&M', category: 'trousers', similarity: 88,
    imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4e26?w=600&q=80',
    offers: [
      { store: 'H&M', productUrl: '#', price: 2599, discount: 18, rating: 4.5, availability: 'In stock' },
    ],
  },
  {
    id: 'shop-3', title: 'Structured Ivory Tank', price: 1899, originalPrice: 2399,
    rating: 4.4, reviewCount: 157, brand: 'Myntra Luxe', category: 'tops', similarity: 84,
    imageUrl: 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600&q=80',
    offers: [
      { store: 'Myntra', productUrl: '#', price: 1899, discount: 21, rating: 4.4, availability: 'In stock' },
    ],
  },
  {
    id: 'shop-4', title: 'Beige Wool Trench Coat', price: 8999, originalPrice: 11499,
    rating: 4.8, reviewCount: 94, brand: 'Toteme', category: 'outerwear', similarity: 91,
    imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
    offers: [
      { store: 'ASOS', productUrl: '#', price: 8999, discount: 22, rating: 4.8, availability: 'In stock' },
    ],
  },
  {
    id: 'shop-5', title: 'Gold Chain Bracelet', price: 1299, originalPrice: undefined,
    rating: 4.6, reviewCount: 203, brand: 'Atelier Nine', category: 'accessories', similarity: 79,
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80',
    offers: [
      { store: 'Nykaa Fashion', productUrl: '#', price: 1299, discount: 0, rating: 4.6, availability: 'In stock' },
    ],
  },
  {
    id: 'shop-6', title: 'White Oversized Blazer', price: 5499, originalPrice: 6999,
    rating: 4.5, reviewCount: 166, brand: 'COS', category: 'blazers', similarity: 87,
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80',
    offers: [
      { store: 'COS', productUrl: '#', price: 5499, discount: 21, rating: 4.5, availability: 'In stock' },
    ],
  },
];

const listQuerySchema = z.object({
  search:   z.string().max(200).optional(),
  category: z.string().optional(),
  page:     z.coerce.number().int().min(1).default(1),
  perPage:  z.coerce.number().int().min(1).max(50).default(12),
});

// ── Controllers ────────────────────────────────────────────────────────

export async function getShoppingRecommendations(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const query  = listQuerySchema.parse(req.query);

  let items = MOCK_CATALOG;

  // Filter by search
  if (query.search) {
    const q = query.search.toLowerCase();
    items = items.filter((i) =>
      i.title.toLowerCase().includes(q) ||
      i.brand.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q),
    );
  }

  // Filter by category
  if (query.category) {
    items = items.filter((i) => i.category.toLowerCase() === query.category!.toLowerCase());
  }

  // Get wishlist for this user
  const wishlistRecs = await prisma.shoppingRecommendation.findMany({
    where: { userId },
    include: { wishlistItems: { where: { userId } } },
  });
  const wishlistedTitles = new Set(
    wishlistRecs
      .filter((r) => r.wishlistItems.length > 0)
      .map((r) => r.title),
  );

  const total = items.length;
  const paginated = items.slice((query.page - 1) * query.perPage, query.page * query.perPage);

  ApiResponse.paginated(
    res,
    paginated.map((item) => ({
      ...item,
      wishlisted: wishlistedTitles.has(item.title),
    })),
    { page: query.page, perPage: query.perPage, total, totalPages: Math.ceil(total / query.perPage) },
  );
}

export async function getPriceComparisons(req: Request, res: Response): Promise<void> {
  const productId = typeof req.params['id'] === 'string' ? req.params['id'] : 'shop-1';
  const item = MOCK_CATALOG.find((i) => i.id === productId);

  if (!item) throw new AppError('Product not found.', 404);

  ApiResponse.success(res, {
    product: { id: item.id, title: item.title, brand: item.brand, imageUrl: item.imageUrl },
    comparisons: item.offers.map((o) => ({
      store: o.store,
      price: o.price,
      discount: o.discount,
      rating: o.rating,
      availability: o.availability,
      url: o.productUrl,
    })),
  });
}

export async function addToWishlist(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { catalogItemId } = z.object({ catalogItemId: z.string().min(1) }).parse(req.body);

  const catalogItem = MOCK_CATALOG.find((i) => i.id === catalogItemId);
  if (!catalogItem) throw new AppError('Product not found.', 404);

  // Upsert recommendation record
  const rec = await prisma.shoppingRecommendation.upsert({
    where: {
      // There's no unique constraint on title alone, so find then upsert by userId+title
      id: (await prisma.shoppingRecommendation.findFirst({
        where: { userId, title: catalogItem.title },
        select: { id: true },
      }))?.id ?? '',
    },
    create: {
      userId,
      title:    catalogItem.title,
      brand:    catalogItem.brand,
      category: catalogItem.category,
      imageUrl: catalogItem.imageUrl,
      similarity: catalogItem.similarity,
      productData: catalogItem as object,
    },
    update: {},
  });

  await prisma.wishlistItem.upsert({
    where: { userId_shoppingRecommendationId: { userId, shoppingRecommendationId: rec.id } },
    create: { userId, shoppingRecommendationId: rec.id },
    update: {},
  });

  ApiResponse.created(res, { wishlisted: true, itemId: catalogItemId }, 'Added to wishlist.');
}

export async function removeFromWishlist(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { catalogItemId } = z.object({ catalogItemId: z.string().min(1) }).parse(req.body);

  const catalogItem = MOCK_CATALOG.find((i) => i.id === catalogItemId);
  if (!catalogItem) throw new AppError('Product not found.', 404);

  const rec = await prisma.shoppingRecommendation.findFirst({
    where: { userId, title: catalogItem.title },
  });

  if (rec) {
    await prisma.wishlistItem.deleteMany({
      where: { userId, shoppingRecommendationId: rec.id },
    });
  }

  ApiResponse.noContent(res);
}

export async function getWishlist(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    include: { recommendation: true },
    orderBy: { createdAt: 'desc' },
  });

  ApiResponse.success(res, items.map((w) => ({
    id: w.id,
    recommendation: w.recommendation,
    createdAt: w.createdAt,
  })));
}
