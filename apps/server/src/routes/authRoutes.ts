import { Router } from 'express';
import { z } from 'zod';
import {
  forgotPassword, getMe, googleAuth, googleCallback, login, logout, refresh, resendVerification,
  resetPassword, signup, verifyEmail,
} from '../controllers/authController';
import { requireAuth } from '../middleware/requireAuth';
import { authLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../utils/validate';
import { authOriginGuard } from '../middleware/authOriginGuard';

const signupSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8).max(128),
  aesthetics: z.array(z.string().trim().min(1).max(50)).max(12).optional(),
  sizes: z.string().trim().max(100).optional(),
}).strict();

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
}).strict();

const forgotSchema = z.object({
  email: z.string().email(),
}).strict();

const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, 'Enter the six-digit verification code.'),
}).strict();

const resetSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(8).max(128),
}).strict();

const router = Router();

router.use(authOriginGuard);
router.post('/signup',          authLimiter, validate(signupSchema),  asyncHandler(signup));
router.post('/login',           authLimiter, validate(loginSchema),   asyncHandler(login));
router.post('/forgot-password', authLimiter, validate(forgotSchema),  asyncHandler(forgotPassword));
router.post('/verify-email',    authLimiter, validate(verifyEmailSchema), asyncHandler(verifyEmail));
router.post('/resend-verification', authLimiter, validate(forgotSchema), asyncHandler(resendVerification));
router.post('/reset-password',  authLimiter, validate(resetSchema),   asyncHandler(resetPassword));
router.get('/google',           authLimiter,                          asyncHandler(googleAuth));
router.get('/google/callback',  authLimiter,                          asyncHandler(googleCallback));
router.post('/refresh',         authLimiter,                          asyncHandler(refresh));
router.post('/logout',          asyncHandler(logout));
router.get( '/me',              requireAuth,                          asyncHandler(getMe));

export default router;
