import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';

const demoProfile = {
  name: 'Maya Kapoor',
  email: 'maya@closetai.com',
  favoriteColors: ['Ivory', 'Black', 'Camel'],
  dominantAesthetics: ['Quiet luxury', 'Minimal chic'],
  sizes: { tops: 'XS-S', bottoms: '26', shoes: '38' },
  preferredColorPalettes: ['Neutrals', 'Warm monochrome'],
  fashionHabits: 'Office, brunch, travel',
};

export async function getProfile(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, demoProfile);
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const updated = { ...demoProfile, ...(req.body as object) };
  ApiResponse.success(res, updated, 'Profile updated.');
}
