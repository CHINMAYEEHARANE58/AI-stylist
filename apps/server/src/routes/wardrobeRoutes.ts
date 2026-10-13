import { Router } from 'express';
import {
  analyzeWardrobeImage, createWardrobeItem, deleteWardrobeImage, deleteWardrobeItem,
  getWardrobe, getWardrobeItem, updateWardrobeItem,
  toggleFavorite, toggleArchive, getWardrobeSummary,
} from '../controllers/wardrobeController';
import { requireAuth } from '../middleware/requireAuth';
import { uploadSingle } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { authOriginGuard } from '../middleware/authOriginGuard';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(authOriginGuard);
router.use(requireAuth);

router.get( '/',              asyncHandler(getWardrobe));
router.get( '/summary',       asyncHandler(getWardrobeSummary));
router.get( '/:id',           asyncHandler(getWardrobeItem));
router.post('/',              uploadLimiter, uploadSingle, asyncHandler(createWardrobeItem));
router.patch('/:id',          uploadLimiter, uploadSingle, asyncHandler(updateWardrobeItem));
router.delete('/:id',         asyncHandler(deleteWardrobeItem));
router.delete('/:id/image',   asyncHandler(deleteWardrobeImage));
router.post('/:id/favorite',  asyncHandler(toggleFavorite));
router.post('/:id/archive',   asyncHandler(toggleArchive));
router.post('/analyze-image', uploadLimiter, uploadSingle, asyncHandler(analyzeWardrobeImage));

export default router;
