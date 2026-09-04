import { Router } from 'express';
import {
  getProfile, updateProfile, updatePreferences, updateSettings, deleteAccount,
} from '../controllers/profileController';
import { requireAuth } from '../middleware/requireAuth';
import { uploadSingle } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth);

router.get( '/',            asyncHandler(getProfile));
router.patch('/profile',    uploadSingle, asyncHandler(updateProfile));
router.patch('/preferences', asyncHandler(updatePreferences));
router.patch('/settings',    asyncHandler(updateSettings));
router.delete('/',           asyncHandler(deleteAccount));

export default router;
