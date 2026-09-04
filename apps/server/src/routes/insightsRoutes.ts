import { Router } from 'express';
import { getNotifications, getTrendInsights, getWardrobeInsights } from '../controllers/insightsController';
import { requireAuth } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/wardrobe',       asyncHandler(getWardrobeInsights));
router.get('/trends',         asyncHandler(getTrendInsights));
router.get('/notifications',  asyncHandler(getNotifications));

export default router;
