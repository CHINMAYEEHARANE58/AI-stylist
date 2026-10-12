import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { uploadImage, deleteFromCloudinary } from '../services/imageService';
import { clearAuthCookies } from '../services/sessionService';
import { requestEmailChange, verifyEmailChange } from '../services/emailChangeService';

// ── Schemas ────────────────────────────────────────────────────────────

const jsonRecord = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.record(z.string()));

const updateProfileSchema = z.object({
  firstName:   z.string().min(1).max(80).trim().optional(),
  lastName:    z.string().max(80).trim().optional(),
  bio:         z.string().max(500).trim().optional(),
  location:    z.string().max(120).trim().optional(),
  clothingSizes: jsonRecord.optional(),
}).strict();

const updatePreferencesSchema = z.object({
  preferredAesthetics: z.array(z.string().max(60)).max(12).optional(),
  favoriteColors:      z.array(z.string().max(60)).max(12).optional(),
  stylePreferences:    z.array(z.string().max(60)).max(12).optional(),
  notificationPreferences: z.record(z.unknown()).optional(),
  privacyPreferences:      z.record(z.unknown()).optional(),
  aiPreferences:           z.record(z.unknown()).optional(),
  appearance: z.enum(['light', 'dark', 'system']).optional(),
}).strict();

const updateSettingsSchema = z.object({
  profile:     updateProfileSchema.optional(),
  preferences: updatePreferencesSchema.optional(),
}).strict();

// ── Controllers ────────────────────────────────────────────────────────

export async function getProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, preferences: true },
  });
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Build public-facing stats
  const [wardrobeCount, savedOutfitCount, outfitCount] = await Promise.all([
    prisma.clothingItem.count({ where: { userId, archived: false } }),
    prisma.savedOutfit.count({ where: { userId } }),
    prisma.outfit.count({ where: { userId } }),
  ]);

  ApiResponse.success(res, {
    id:       user.id,
    email:    user.email,
    role:     user.role.toLowerCase(),
    emailVerified: !!user.emailVerifiedAt,
    profile:  user.profile,
    preferences: user.preferences,
    stats: {
      wardrobeItems: wardrobeCount,
      savedOutfits:  savedOutfitCount,
      outfitsGenerated: outfitCount,
    },
  });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  // Handle avatar upload if present
  let imageUrl: string | undefined;
  let imageProviderId: string | undefined;

  if (req.file) {
    const result = await uploadImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      userId,
      'profile',
    );
    imageUrl = result.url;
    imageProviderId = result.providerId;

    // Delete old avatar from Cloudinary
    const existing = await prisma.userProfile.findUnique({
      where: { userId },
      select: { imageUrl: true },
    });
    if (existing?.imageUrl && imageProviderId) {
      // Only try to delete if it has a provider ID prefix pattern
      if (existing.imageUrl.includes('cloudinary.com')) {
        const oldId = existing.imageUrl.split('/').slice(-1)[0]?.split('.')[0];
        if (oldId) {
          void deleteFromCloudinary(`closetai/profile/${userId}/${oldId}`);
        }
      }
    }
  }

  const body = updateProfileSchema.parse(req.body);

  const profile = await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      firstName: body.firstName ?? 'User',
      lastName:  body.lastName,
      bio:       body.bio,
      location:  body.location,
      clothingSizes: body.clothingSizes,
      ...(imageUrl && { imageUrl }),
    },
    update: {
      ...body,
      ...(imageUrl && { imageUrl }),
    },
  });

  ApiResponse.success(res, profile, 'Profile updated.');
}

export async function updatePreferences(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const data   = updatePreferencesSchema.parse(req.body);

  // Cast JSON fields to Prisma-compatible InputJsonValue
  const jsonSafe = {
    ...data,
    notificationPreferences: data.notificationPreferences !== undefined
      ? (data.notificationPreferences as Prisma.InputJsonValue)
      : undefined,
    privacyPreferences: data.privacyPreferences !== undefined
      ? (data.privacyPreferences as Prisma.InputJsonValue)
      : undefined,
    aiPreferences: data.aiPreferences !== undefined
      ? (data.aiPreferences as Prisma.InputJsonValue)
      : undefined,
  };

  const prefs = await prisma.userPreference.upsert({
    where: { userId },
    create: { userId, ...jsonSafe },
    update: jsonSafe,
  });

  ApiResponse.success(res, prefs, 'Preferences updated.');
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { profile: profileData, preferences: prefsData } = updateSettingsSchema.parse(req.body);

  const results: Record<string, unknown> = {};

  if (profileData) {
    results['profile'] = await prisma.userProfile.upsert({
      where: { userId },
      create: { userId, firstName: profileData.firstName ?? 'User', ...profileData },
      update: profileData,
    });
  }

  if (prefsData) {
    const jsonSafe = {
      ...prefsData,
      notificationPreferences: prefsData.notificationPreferences !== undefined
        ? (prefsData.notificationPreferences as Prisma.InputJsonValue)
        : undefined,
      privacyPreferences: prefsData.privacyPreferences !== undefined
        ? (prefsData.privacyPreferences as Prisma.InputJsonValue)
        : undefined,
      aiPreferences: prefsData.aiPreferences !== undefined
        ? (prefsData.aiPreferences as Prisma.InputJsonValue)
        : undefined,
    };

    results['preferences'] = await prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...jsonSafe },
      update: jsonSafe,
    });
  }

  ApiResponse.success(res, results, 'Settings updated.');
}

export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { currentPassword, confirmation } = req.body as { currentPassword: string; confirmation: string };
  if (confirmation !== 'DELETE') {
    throw new AppError('Type DELETE to confirm account deletion.', 422, true, 'DELETE_CONFIRMATION_REQUIRED');
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError('Your current password is incorrect.', 401, true, 'INVALID_CURRENT_PASSWORD');
  }
  // Cascade deletes handle all private, user-owned data as defined in the schema.
  await prisma.user.delete({ where: { id: userId } });
  clearAuthCookies(res);
  ApiResponse.success(res, null, 'Account deleted.');
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user?.passwordHash) {
    throw new AppError('Set a password from your account recovery flow before changing it here.', 400, true, 'PASSWORD_NOT_AVAILABLE');
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError('Your current password is incorrect.', 401, true, 'INVALID_CURRENT_PASSWORD');
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw new AppError('Choose a password you have not used for this account.', 422, true, 'PASSWORD_UNCHANGED');
  }
  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } }),
    prisma.refreshSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } }),
  ]);
  clearAuthCookies(res);
  ApiResponse.success(res, null, 'Password updated. Please sign in again.');
}

export async function requestEmailChangeCode(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { newEmail, currentPassword } = req.body as { newEmail: string; currentPassword: string };
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: { select: { firstName: true, lastName: true } } },
  });
  if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError('Your current password is incorrect.', 401, true, 'INVALID_CURRENT_PASSWORD');
  }
  const normalizedEmail = newEmail.trim().toLowerCase();
  if (normalizedEmail === user.email) {
    throw new AppError('Enter a different email address.', 422, true, 'EMAIL_UNCHANGED');
  }
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (existing && existing.id !== userId) {
    throw new AppError('That email address is already in use.', 409, true, 'EMAIL_ALREADY_IN_USE');
  }
  const name = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') || user.email;
  await requestEmailChange({ userId, newEmail: normalizedEmail, name });
  ApiResponse.success(res, { newEmail: normalizedEmail }, 'A verification code has been sent to your new email address.');
}

export async function confirmEmailChange(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { newEmail, code } = req.body as { newEmail: string; code: string };
  await verifyEmailChange({ userId, newEmail: newEmail.trim().toLowerCase(), code });
  clearAuthCookies(res);
  ApiResponse.success(res, null, 'Email updated. Please sign in again with your new email address.');
}
