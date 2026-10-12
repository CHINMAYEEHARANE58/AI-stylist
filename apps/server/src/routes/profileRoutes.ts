import { Router } from 'express';
import {
  changePassword, confirmEmailChange, deleteAccount, getProfile, requestEmailChangeCode,
  updateProfile, updatePreferences, updateSettings,
} from '../controllers/profileController';
import { requireAuth } from '../middleware/requireAuth';
import { uploadSingle } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';
import { authLimiter } from '../middleware/rateLimiter';
import { authOriginGuard } from '../middleware/authOriginGuard';
import { validate } from '../utils/validate';
import { z } from 'zod';

const router = Router();
const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
}).strict();
const emailChangeRequestSchema = z.object({
  newEmail: z.string().trim().email().max(254),
  currentPassword: z.string().min(1).max(128),
}).strict();
const emailChangeConfirmSchema = z.object({
  newEmail: z.string().trim().email().max(254),
  code: z.string().regex(/^\d{6}$/, 'Enter the six-digit verification code.'),
}).strict();
const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  confirmation: z.literal('DELETE'),
}).strict();

router.use(authOriginGuard);
router.use(requireAuth);

router.get( '/',            asyncHandler(getProfile));
router.patch('/profile',    uploadSingle, asyncHandler(updateProfile));
router.patch('/preferences', asyncHandler(updatePreferences));
router.patch('/settings',    asyncHandler(updateSettings));
router.post('/password', authLimiter, validate(passwordSchema), asyncHandler(changePassword));
router.post('/email-change/request', authLimiter, validate(emailChangeRequestSchema), asyncHandler(requestEmailChangeCode));
router.post('/email-change/confirm', authLimiter, validate(emailChangeConfirmSchema), asyncHandler(confirmEmailChange));
router.post('/delete-account', authLimiter, validate(deleteAccountSchema), asyncHandler(deleteAccount));

export default router;
