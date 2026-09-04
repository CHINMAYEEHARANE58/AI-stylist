import { Router } from 'express';
import { z } from 'zod';
import {
  deleteOutfit, generateOutfitRecommendations, getSavedOutfits,
  getWeatherStyling, saveOutfit, styleSingleItem,
} from '../controllers/outfitController';
import { requireAuth } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../utils/validate';

const generateSchema = z.object({
  occasion:   z.string().optional(),
  weather:    z.string().optional(),
  mood:       z.string().optional(),
  anchorItem: z.string().optional(),
  notes:      z.string().max(500).optional(),
});

const styleItemSchema = z.object({
  itemName: z.string().min(1),
});

const router = Router();

router.use(requireAuth);

router.get( '/saved',            asyncHandler(getSavedOutfits));
router.post('/generate',         validate(generateSchema),    asyncHandler(generateOutfitRecommendations));
router.post('/style-item',       validate(styleItemSchema),   asyncHandler(styleSingleItem));
router.get( '/weather',          asyncHandler(getWeatherStyling));
router.post('/',                 asyncHandler(saveOutfit));
router.delete('/:id',            asyncHandler(deleteOutfit));

export default router;
