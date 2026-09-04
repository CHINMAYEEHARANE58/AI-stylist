import { Router } from 'express';
import {
  analyzeWardrobeImage, createWardrobeItem, deleteWardrobeItem,
  getWardrobe, getWardrobeItem, updateWardrobeItem,
  toggleFavorite, toggleArchive, getWardrobeSummary,
} from '../controllers/wardrobeController';
import { requireAuth } from '../middleware/requireAuth';
import { uploadSingle } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth);

router.get( '/',              asyncHandler(getWardrobe));
router.get( '/summary',       asyncHandler(getWardrobeSummary));
router.get( '/:id',           asyncHandler(getWardrobeItem));
router.post('/',              uploadSingle, asyncHandler(createWardrobeItem));
router.patch('/:id',          asyncHandler(updateWardrobeItem));
router.delete('/:id',         asyncHandler(deleteWardrobeItem));
router.post('/:id/favorite',  asyncHandler(toggleFavorite));
router.post('/:id/archive',   asyncHandler(toggleArchive));
router.post('/analyze-image', uploadSingle, asyncHandler(analyzeWardrobeImage));

export default router;
