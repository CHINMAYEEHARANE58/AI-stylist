import { Router } from 'express';
import {
  addToWishlist, getPriceComparisons, getShoppingRecommendations, removeFromWishlist,
} from '../controllers/shoppingController';
import { requireAuth } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get( '/recommendations', asyncHandler(getShoppingRecommendations));
router.get( '/compare',         asyncHandler(getPriceComparisons));
router.post('/wishlist',        asyncHandler(addToWishlist));
router.delete('/wishlist/:id',  asyncHandler(removeFromWishlist));

export default router;
