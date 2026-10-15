import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { requireAuth } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { getWeatherStylingContext } from '../services/weatherService';
import { weatherLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(requireAuth);
router.get('/', weatherLimiter, asyncHandler(async (req, res) => {
  const { city } = z.object({ city: z.string().trim().min(2).max(120).optional() }).strict().parse(req.query);
  const preference = city ? null : await prisma.userPreference.findUnique({
    where: { userId: req.user!.id }, select: { weatherCity: true },
  });
  ApiResponse.success(res, await getWeatherStylingContext(city ?? preference?.weatherCity));
}));
export default router;
