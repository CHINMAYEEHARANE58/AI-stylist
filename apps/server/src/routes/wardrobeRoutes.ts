import { Router } from 'express';
import { z } from 'zod';
import {
  analyzeWardrobeImage, createWardrobeItem, deleteWardrobeItem,
  getWardrobe, getWardrobeItem, updateWardrobeItem,
} from '../controllers/wardrobeController';
import { requireAuth } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../utils/validate';

const createItemSchema = z.object({
  name:     z.string().min(1).max(200),
  image:    z.string().url().optional(),
  color:    z.string().optional(),
  brand:    z.string().optional(),
  season:   z.string().optional(),
  occasion: z.string().optional(),
  pattern:  z.string().optional(),
  fabric:   z.string().optional(),
});

const router = Router();

router.use(requireAuth);

router.get( '/',              asyncHandler(getWardrobe));
router.get( '/:id',           asyncHandler(getWardrobeItem));
router.post('/',              validate(createItemSchema), asyncHandler(createWardrobeItem));
router.put( '/:id',           asyncHandler(updateWardrobeItem));
router.delete('/:id',         asyncHandler(deleteWardrobeItem));
router.post('/analyze-image', asyncHandler(analyzeWardrobeImage));

export default router;
