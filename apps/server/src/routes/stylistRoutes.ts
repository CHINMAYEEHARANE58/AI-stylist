import { Router } from 'express';
import { z } from 'zod';
import { chat, getEventStyling } from '../controllers/stylistController';
import { requireAuth } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../utils/validate';

const chatSchema = z.object({
  message: z.string().min(1).max(500),
});

const router = Router();

router.use(requireAuth);

router.post('/chat',  validate(chatSchema), asyncHandler(chat));
router.get( '/event', asyncHandler(getEventStyling));

export default router;
