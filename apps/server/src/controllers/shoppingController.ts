import type { Request, Response } from 'express';
import { shoppingSuggestions } from '../data/mockData';
import { recommendShoppingAdditions } from '../services/aiService';
import { ApiResponse } from '../utils/ApiResponse';

const priceComparisons = [
  { store: 'Amazon', price: 4199, discount: 22, rating: 4.3, availability: 'In stock', deliveryDays: 2 },
  { store: 'Myntra', price: 4399, discount: 18, rating: 4.6, availability: 'In stock', deliveryDays: 3 },
  { store: 'Ajio',   price: 4099, discount: 26, rating: 4.2, availability: 'Limited',  deliveryDays: 4 },
  { store: 'H&M',    price: 4599, discount: 10, rating: 4.8, availability: 'In stock', deliveryDays: 5 },
  { store: 'Zara',   price: 4299, discount: 14, rating: 4.7, availability: 'In stock', deliveryDays: 3 },
];

export async function getShoppingRecommendations(_req: Request, res: Response): Promise<void> {
  const reasons = await recommendShoppingAdditions();
  ApiResponse.success(res, { items: shoppingSuggestions, reasons });
}

export async function getPriceComparisons(req: Request, res: Response): Promise<void> {
  const product = typeof req.query['product'] === 'string'
    ? req.query['product']
    : 'Neutral Leather Sneakers';
  ApiResponse.success(res, { product, comparisons: priceComparisons });
}

export async function addToWishlist(req: Request, res: Response): Promise<void> {
  ApiResponse.created(res, { itemId: req.body.itemId, wishlisted: true }, 'Added to wishlist.');
}

export async function removeFromWishlist(_req: Request, res: Response): Promise<void> {
  ApiResponse.noContent(res);
}
