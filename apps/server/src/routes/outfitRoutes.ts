import { Router } from 'express';
import {
  generateOutfitRecommendations, getSavedOutfits, getSavedOutfit, updateSavedOutfit, saveOutfit,
  deleteSavedOutfit, styleSingleItem, toggleOutfitFavorite, getCollections,
} from '../controllers/outfitController';
import { requireAuth } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';
import { authOriginGuard } from '../middleware/authOriginGuard';
import { outfitGenerationLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(requireAuth);
router.use(authOriginGuard);

router.get( '/saved',              asyncHandler(getSavedOutfits));
router.get( '/saved/:id',          asyncHandler(getSavedOutfit));
router.patch('/saved/:id',         asyncHandler(updateSavedOutfit));
router.get( '/collections',        asyncHandler(getCollections));
router.post('/generate',           outfitGenerationLimiter, asyncHandler(generateOutfitRecommendations));
router.post('/style-item',         outfitGenerationLimiter, asyncHandler(styleSingleItem));
router.post('/',                   asyncHandler(saveOutfit));
router.delete('/saved/:id',        asyncHandler(deleteSavedOutfit));
router.post('/:id/favorite',       asyncHandler(toggleOutfitFavorite));

export default router;
