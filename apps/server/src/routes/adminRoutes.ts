import { Router } from 'express';
import {
  getDashboardStats, getModerationQueue, getUsers,
} from '../controllers/adminController';
import { requireAuth, requireAdmin } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/stats',       asyncHandler(getDashboardStats));
router.get('/users',       asyncHandler(getUsers));
router.get('/moderation',  asyncHandler(getModerationQueue));

export default router;
