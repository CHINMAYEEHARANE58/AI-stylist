import { Router } from 'express';
import { chat, deleteConversation, getConversation, listConversations } from '../controllers/stylistController';
import { requireAuth } from '../middleware/requireAuth';
import { authOriginGuard } from '../middleware/authOriginGuard';
import { asyncHandler } from '../utils/asyncHandler';
import rateLimit from 'express-rate-limit';

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.id ?? String(req.ip),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI requests. Please wait a moment.' },
});

const router = Router();
router.use(requireAuth);
router.use(authOriginGuard);

router.post('/chat', aiLimiter, asyncHandler(chat));
router.get('/conversations', asyncHandler(listConversations));
router.get('/conversations/:id', asyncHandler(getConversation));
router.delete('/conversations/:id', asyncHandler(deleteConversation));

export default router;
