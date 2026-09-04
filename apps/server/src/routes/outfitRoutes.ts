import { Router } from 'express';
import {
  generateOutfitRecommendations, getSavedOutfits, saveOutfit,
  deleteSavedOutfit, styleSingleItem, toggleOutfitFavorite, getCollections,
} from '../controllers/outfitController';
import { requireAuth } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth);

router.get( '/saved',              asyncHandler(getSavedOutfits));
router.get( '/collections',        asyncHandler(getCollections));
router.post('/generate',           asyncHandler(generateOutfitRecommendations));
router.post('/style-item',         asyncHandler(styleSingleItem));
router.post('/',                   asyncHandler(saveOutfit));
router.delete('/saved/:id',        asyncHandler(deleteSavedOutfit));
router.post('/:id/favorite',       asyncHandler(toggleOutfitFavorite));

export default router;
