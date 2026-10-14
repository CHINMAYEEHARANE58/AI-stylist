import { Router } from 'express';
import { analyzeInspirationImage, getSavedInspirations, getInspiration, getInspirationImage, deleteInspiration } from '../controllers/pinterestController';
import { requireAuth } from '../middleware/requireAuth';
import { uploadSingle } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { authOriginGuard } from '../middleware/authOriginGuard';
import { uploadLimiter, outfitGenerationLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(requireAuth);
router.use(authOriginGuard);

router.post('/analyze',       uploadLimiter, outfitGenerationLimiter, uploadSingle, asyncHandler(analyzeInspirationImage));
router.get( '/',              asyncHandler(getSavedInspirations));
router.get('/:id/image',      asyncHandler(getInspirationImage));
router.get('/:id',            asyncHandler(getInspiration));
router.delete('/:id',         asyncHandler(deleteInspiration));

export default router;
