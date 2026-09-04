import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileController';
import { requireAuth } from '../middleware/requireAuth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get( '/', asyncHandler(getProfile));
router.put( '/', asyncHandler(updateProfile));
router.patch('/', asyncHandler(updateProfile));

export default router;
