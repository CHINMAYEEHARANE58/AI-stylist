import { Router } from 'express';
import { analyzeInspirationImage, recreateLook } from '../controllers/pinterestController';
import { requireAuth } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.post('/recreate',         asyncHandler(recreateLook));
router.post('/analyze-image',    asyncHandler(analyzeInspirationImage));

export default router;
