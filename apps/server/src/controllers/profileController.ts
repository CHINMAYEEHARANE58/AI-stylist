import type { Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { uploadImage, deleteFromCloudinary } from '../services/imageService';

// ── Schemas ────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  firstName:   z.string().min(1).max(80).trim().optional(),
  lastName:    z.string().max(80).trim().optional(),
  bio:         z.string().max(500).trim().optional(),
  location:    z.string().max(120).trim().optional(),
  clothingSizes: z.record(z.string()).optional(),
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
  if (!user) throw new AppError('User not found.', 404);

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
        if (oldId) void deleteFromCloudinary(`closetai/profile/${userId}/${oldId}`);
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
  // Cascade deletes handle all related data (as defined in Prisma schema)
  await prisma.user.delete({ where: { id: userId } });
  ApiResponse.noContent(res);
}
