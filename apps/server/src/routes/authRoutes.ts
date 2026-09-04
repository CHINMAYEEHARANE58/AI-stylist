import { Router } from 'express';
import { z } from 'zod';
import {
  forgotPassword, getMe, googleAuth, login, logout, refresh, resetPassword, signup,
} from '../controllers/authController';
import { requireAuth } from '../middleware/requireAuth';
import { authLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../utils/validate';

const signupSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8).max(128),
  profile:  z.record(z.unknown()).optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const forgotSchema = z.object({
  email: z.string().email(),
}).strict();

const resetSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(12).max(128),
}).strict();

const router = Router();

router.post('/signup',          authLimiter, validate(signupSchema),  asyncHandler(signup));
router.post('/login',           authLimiter, validate(loginSchema),   asyncHandler(login));
router.post('/forgot-password', authLimiter, validate(forgotSchema),  asyncHandler(forgotPassword));
router.post('/reset-password',  authLimiter, validate(resetSchema),   asyncHandler(resetPassword));
router.post('/google',          authLimiter,                          asyncHandler(googleAuth));
router.post('/refresh',         authLimiter,                          asyncHandler(refresh));
router.post('/logout',          asyncHandler(logout));
router.get( '/me',              requireAuth,                          asyncHandler(getMe));

export default router;
