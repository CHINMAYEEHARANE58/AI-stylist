import type { Request, Response } from 'express';
import { generatedOutfits } from '../data/mockData';
import { generateOutfits } from '../services/aiService';
import { getWeatherStylingContext } from '../services/weatherService';
import { ApiResponse } from '../utils/ApiResponse';

export async function getSavedOutfits(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, { outfits: generatedOutfits });
}

export async function generateOutfitRecommendations(req: Request, res: Response): Promise<void> {
  const outfits = await generateOutfits(req.body as {
    occasion?: string;
    weather?: string;
    anchorItem?: string;
    mood?: string;
    notes?: string;
  });
  ApiResponse.success(res, { outfits }, 'Outfits generated.');
}

export async function styleSingleItem(req: Request, res: Response): Promise<void> {
  const { itemName = 'selected item' } = req.body as { itemName?: string };

  ApiResponse.success(res, {
    itemName,
    looks: [
      { aesthetic: 'Casual',  explanation: `${itemName} works with soft denim and low-profile sneakers.` },
      { aesthetic: 'Elegant', explanation: `${itemName} pairs well with luminous basics and refined accessories.` },
      { aesthetic: 'Office',  explanation: `${itemName} anchors a smart silhouette when balanced with tailoring.` },
      { aesthetic: 'Party',   explanation: `${itemName} gains energy with shine, contrast, and sharper accessories.` },
    ],
  });
}

export async function getWeatherStyling(req: Request, res: Response): Promise<void> {
  const city = typeof req.query['city'] === 'string' ? req.query['city'] : undefined;
  const context = await getWeatherStylingContext(city);
  ApiResponse.success(res, context);
}

export async function saveOutfit(req: Request, res: Response): Promise<void> {
  ApiResponse.created(res, { id: `outfit-${Date.now()}`, ...req.body }, 'Outfit saved.');
}

export async function deleteOutfit(_req: Request, res: Response): Promise<void> {
  ApiResponse.noContent(res);
}
