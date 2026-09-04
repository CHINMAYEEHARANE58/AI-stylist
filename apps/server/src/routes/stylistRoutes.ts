import { Router } from 'express';
import { chat } from '../controllers/stylistController';
import { requireAuth } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';
import rateLimit from 'express-rate-limit';

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI requests. Please wait a moment.' },
});

const router = Router();
router.use(requireAuth);

router.post('/chat', aiLimiter, asyncHandler(chat));

export default router;
