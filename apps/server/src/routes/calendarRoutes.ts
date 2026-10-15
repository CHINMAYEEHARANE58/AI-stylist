import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { authOriginGuard } from '../middleware/authOriginGuard';
import { outfitGenerationLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { createEvent, deleteEvent, listEvents, suggestEventOutfit, updateEvent } from '../controllers/calendarController';

const router = Router();
router.use(requireAuth, authOriginGuard);
router.get('/', asyncHandler(listEvents));
router.post('/', asyncHandler(createEvent));
router.patch('/:id', asyncHandler(updateEvent));
router.delete('/:id', asyncHandler(deleteEvent));
router.post('/:id/suggest', outfitGenerationLimiter, asyncHandler(suggestEventOutfit));
export default router;
