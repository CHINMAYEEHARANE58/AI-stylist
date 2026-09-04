import { Router } from 'express';
import { analyzeInspirationImage, getSavedInspirations, deleteInspiration } from '../controllers/pinterestController';
import { requireAuth } from '../middleware/requireAuth';
import { uploadSingle } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth);

router.post('/analyze',       uploadSingle, asyncHandler(analyzeInspirationImage));
router.get( '/',              asyncHandler(getSavedInspirations));
router.delete('/:id',         asyncHandler(deleteInspiration));

export default router;
