import type { Request, Response } from 'express';
import { recreatePinterestLook } from '../services/aiService';
import { ApiResponse } from '../utils/ApiResponse';

export async function recreateLook(_req: Request, res: Response): Promise<void> {
  const result = await recreatePinterestLook();
  ApiResponse.success(res, result, 'Pinterest look recreated from your wardrobe.');
}

export async function analyzeInspirationImage(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, {
    similarity: 87,
    detectedStyle: 'Quiet luxury — neutral editorial',
    matchedItems: ['Ivory Satin Blouse', 'Black Tailored Skirt', 'Cream Sneakers'],
    missingPieces: [
      { name: 'Soft beige trench coat', budget: '₹6,000–10,000' },
      { name: 'Structured leather tote', budget: '₹4,000–8,000' },
    ],
  }, 'Inspiration analysed.');
}
