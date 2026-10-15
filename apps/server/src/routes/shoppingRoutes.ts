import { Router } from 'express';
import {
  getShoppingRecommendations, refreshShoppingRecommendations, getPriceComparisons,
  addToWishlist, removeFromWishlist, getWishlist, getProductDetails, refreshProductOffers,
} from '../controllers/shoppingController';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/requireAuth';
import { authOriginGuard } from '../middleware/authOriginGuard';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth);
router.use(authOriginGuard);

const offerRefreshLimit = rateLimit({ windowMs: 60_000, limit: 4, standardHeaders: 'draft-7',
  legacyHeaders: false, keyGenerator: (req) => req.user?.id ?? 'anonymous',
  message: { success: false, message: 'Offer refresh limit reached. Try again shortly.' } });

router.get( '/',                  asyncHandler(getShoppingRecommendations));
router.post('/refresh',           asyncHandler(refreshShoppingRecommendations));
router.get( '/wishlist',          asyncHandler(getWishlist));
router.post('/wishlist',          asyncHandler(addToWishlist));
router.delete('/wishlist',        asyncHandler(removeFromWishlist));
router.get( '/compare/:id',       asyncHandler(getPriceComparisons));
router.get( '/products/:id',      asyncHandler(getProductDetails));
router.post('/products/:id/refresh', offerRefreshLimit, asyncHandler(refreshProductOffers));

export default router;
