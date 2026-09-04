import type { Request, Response } from 'express';
import { shoppingSuggestions, wardrobeItems } from '../data/mockData';
import { ApiResponse } from '../utils/ApiResponse';

export async function getWardrobeInsights(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, {
    detectedTypes: ['Blouse', 'Skirt', 'Blazer', 'Denim', 'Sneakers', 'Necklace'],
    colors: ['Ivory', 'Black', 'Camel', 'Denim blue', 'Cream', 'Gold'],
    patterns: ['Solid'],
    dominantAesthetics: ['Quiet luxury', 'Minimal chic', 'Street polish'],
    wardrobeGaps: [
      'Missing neutral sneakers',
      'Need more formal tops',
      'Need versatile outerwear',
    ],
    usage: {
      mostWornColors: ['Ivory', 'Black', 'Camel'],
      favoriteCategories: ['Tops', 'Accessories', 'Bottoms'],
      outfitHistory: ['Office', 'Brunch', 'Date night'],
    },
    itemCount: wardrobeItems.length,
  });
}

export async function getTrendInsights(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, {
    trends: [
      'Chocolate and ivory contrast',
      'Soft tailoring',
      'Metallic accents',
      'Neutral sneakers',
    ],
    seasonalRecommendations: [
      'Choose breathable layers during humid weather.',
      'Keep rain-friendly footwear in saved office looks.',
      'Use gold accents to refresh neutral outfits.',
    ],
    productRecommendations: shoppingSuggestions,
  });
}

export async function getNotifications(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, {
    notifications: [
      { id: 'n1', message: 'Daily outfit ready: rainy-day office look with camel blazer.', type: 'outfit',  read: false, time: '2 min ago' },
      { id: 'n2', message: 'Weather alert: carry lightweight outerwear for evening showers.', type: 'weather', read: false, time: '1 hr ago' },
      { id: 'n3', message: 'Sale: neutral sneakers dropped 18% on Ajio.', type: 'sale',    read: false, time: '3 hr ago' },
      { id: 'n4', message: 'Trend alert: ivory layers and gold accents match your saved looks.', type: 'trend', read: true, time: 'Yesterday' },
    ],
  });
}
