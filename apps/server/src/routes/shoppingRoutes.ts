import { Router } from 'express';
import {
  getShoppingRecommendations, getPriceComparisons,
  addToWishlist, removeFromWishlist, getWishlist,
} from '../controllers/shoppingController';
import { requireAuth } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth);

router.get( '/',                  asyncHandler(getShoppingRecommendations));
router.get( '/wishlist',          asyncHandler(getWishlist));
router.post('/wishlist',          asyncHandler(addToWishlist));
router.delete('/wishlist',        asyncHandler(removeFromWishlist));
router.get( '/compare/:id',       asyncHandler(getPriceComparisons));

export default router;
