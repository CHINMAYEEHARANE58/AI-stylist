import { Router } from 'express';
import {
  getWardrobeInsights, getTrendInsights,
  getNotifications, getUnreadCount, markNotificationRead, markAllRead, deleteNotification,
  getDashboardSummary,
} from '../controllers/insightsController';
import { requireAuth } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth);

// Dashboard
router.get('/dashboard',        asyncHandler(getDashboardSummary));

// Wardrobe & trend insights
router.get('/wardrobe',         asyncHandler(getWardrobeInsights));
router.get('/trends',           asyncHandler(getTrendInsights));

// Notifications
router.get('/notifications',    asyncHandler(getNotifications));
router.get('/notifications/unread-count', asyncHandler(getUnreadCount));
router.post('/notifications/mark-all-read', asyncHandler(markAllRead));
router.patch('/notifications/:id/read', asyncHandler(markNotificationRead));
router.delete('/notifications/:id',     asyncHandler(deleteNotification));

export default router;
