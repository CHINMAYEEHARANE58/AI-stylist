import type { Request, Response } from 'express';
import { wardrobeItems } from '../data/mockData';
import { tagWardrobeItem } from '../services/aiService';
import { ApiResponse } from '../utils/ApiResponse';

type WardrobeItem = {
  id: string;
  name: string;
  category: string;
  image: string;
  color: string;
  brand: string;
  style: string;
  season: string;
  occasion: string;
  pattern: string;
  fabric: string;
  favorite?: boolean;
  aiTags?: Awaited<ReturnType<typeof tagWardrobeItem>>;
};

// In-memory session store (replaced by DB in next phase)
const sessionItems: WardrobeItem[] = [...wardrobeItems];

export async function getWardrobe(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, { items: sessionItems, total: sessionItems.length });
}

export async function getWardrobeItem(req: Request, res: Response): Promise<void> {
  const item = sessionItems.find((i) => i.id === req.params.id);
  if (!item) {
    res.status(404).json({ success: false, message: 'Item not found.' });
    return;
  }
  ApiResponse.success(res, item);
}

export async function createWardrobeItem(req: Request, res: Response): Promise<void> {
  const body = req.body as Partial<WardrobeItem>;
  const aiTags = await tagWardrobeItem(body.name ?? 'Untitled item');

  const item: WardrobeItem = {
    id: `item-${Date.now()}`,
    name: body.name ?? 'Untitled item',
    category: body.category ?? aiTags.clothingType,
    image: body.image ?? '/wardrobe-placeholder.svg',
    color: aiTags.colors[0] ?? '',
    brand: body.brand ?? 'Unknown',
    style: body.style ?? aiTags.aesthetic,
    season: body.season ?? 'All season',
    occasion: body.occasion ?? 'Casual',
    pattern: body.pattern ?? 'Solid',
    fabric: body.fabric ?? 'Unknown',
    favorite: body.favorite ?? false,
    aiTags,
  };

  sessionItems.unshift(item);
  ApiResponse.created(res, item, 'Wardrobe item added.');
}

export async function updateWardrobeItem(req: Request, res: Response): Promise<void> {
  const idx = sessionItems.findIndex((i) => i.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Item not found.' });
    return;
  }
  sessionItems[idx] = { ...sessionItems[idx], ...(req.body as Partial<WardrobeItem>) };
  ApiResponse.success(res, sessionItems[idx], 'Item updated.');
}

export async function deleteWardrobeItem(req: Request, res: Response): Promise<void> {
  const idx = sessionItems.findIndex((i) => i.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ success: false, message: 'Item not found.' });
    return;
  }
  sessionItems.splice(idx, 1);
  ApiResponse.noContent(res);
}

export async function analyzeWardrobeImage(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, {
    clothingType: 'Blazer',
    colors: ['Camel'],
    patterns: ['Solid'],
    aesthetic: 'Minimal classic',
    category: 'Formal',
  }, 'Image analysed.');
}
