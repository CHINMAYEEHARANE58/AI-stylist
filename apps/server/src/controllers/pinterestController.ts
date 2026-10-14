import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { getAIProvider } from '../services/ai/index';
import { inspirationAttributesSchema, matchInspirationAttributes } from '../services/ai/inspirationMatching';
import { cloudinaryInspirationDownloadUrl, deleteStoredInspirationImage,
  prepareInspirationImage, readLocalInspirationImage, storeInspirationImage } from '../services/inspirationStorage';

const pageSchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) }).strict();
const storedAttributesSchema = inspirationAttributesSchema.extend({
  provider: z.string().optional(), model: z.string().optional(),
});
const matchSchema = z.array(z.object({
  clothingItemId: z.string(), itemName: z.string(), category: z.string(),
  score: z.number().int().min(0).max(100), reason: z.string(),
}).strict()).max(12);
const missingSchema = z.array(z.object({
  category: z.string(), description: z.string(), colors: z.array(z.string()), reason: z.string(),
}).strict()).max(12);
const recreationSchema = z.object({
  clothingItemIds: z.array(z.string()), explanation: z.string(), overallScore: z.number().int().min(0).max(100),
}).strict();

function param(req: Request, key: string): string {
  const value = req.params[key];
  if (!value || Array.isArray(value)) { throw new AppError('Invalid inspiration identifier.', 400); }
  return value;
}

function userIdFrom(req: Request): string {
  if (!req.user) { throw new AppError('Authentication required.', 401); }
  return req.user.id;
}

async function ownedInspiration(id: string, userId: string) {
  const inspiration = await prisma.inspirationImage.findFirst({
    where: { id, userId },
    include: { matches: { where: { userId }, orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  if (!inspiration) { throw new AppError('Inspiration not found.', 404); }
  return inspiration;
}

async function detailForUser(id: string, userId: string) {
  const inspiration = await ownedInspiration(id, userId);
  const attributes = storedAttributesSchema.safeParse(inspiration.analysis);
  const match = inspiration.matches[0];
  const matchedItems = matchSchema.safeParse(match?.matchedItems);
  const missingPieces = missingSchema.safeParse(match?.missingItems);
  const recreation = recreationSchema.safeParse(match?.recreation);
  if (!attributes.success || !match || !matchedItems.success || !missingPieces.success || !recreation.success) {
    throw new AppError('This inspiration has an older or incomplete analysis. Please upload it again.', 409, true, 'INSPIRATION_ANALYSIS_UNAVAILABLE');
  }

  const ids = matchedItems.data.map((item) => item.clothingItemId);
  const current = ids.length ? await prisma.clothingItem.findMany({
    where: { id: { in: ids }, userId, archived: false },
  }) : [];
  const itemMap = new Map(current.map((item) => [item.id, item]));
  const availableMatches = matchedItems.data.filter((item) => itemMap.has(item.clothingItemId));
  const removedMatches = matchedItems.data.filter((item) => !itemMap.has(item.clothingItemId));
  const currentScore = Math.round(availableMatches.reduce((total, item) => total + item.score, 0) / attributes.data.garments.length);
  return {
    id: inspiration.id,
    title: inspiration.title,
    imageUrl: inspiration.imageUrl,
    createdAt: inspiration.createdAt,
    analysis: {
      ...attributes.data,
      matchedItems: matchedItems.data.map((item) => ({
        ...item,
        item: itemMap.get(item.clothingItemId) ?? null,
        available: itemMap.has(item.clothingItemId),
      })),
      missingPieces: [
        ...missingPieces.data,
        ...removedMatches.map((item) => ({ category: item.category, description: item.itemName,
          colors: [], reason: 'Previously matched item is no longer available in your wardrobe.' })),
      ],
      recreationSuggestion: {
        ...recreation.data,
        clothingItemIds: recreation.data.clothingItemIds.filter((itemId) => itemMap.has(itemId)),
        overallScore: currentScore,
        explanation: `${availableMatches.length} available owned pieces cover ${availableMatches.length} of ${attributes.data.garments.length} detected garments. Missing or removed pieces are listed separately.`,
      },
      matchingMethod: match.matchMethod,
      provider: attributes.data.provider ?? 'unknown',
      model: attributes.data.model ?? 'unknown',
    },
  };
}

export async function analyzeInspirationImage(req: Request, res: Response): Promise<void> {
  const userId = userIdFrom(req);
  if (!req.file) {
    throw new AppError('Upload a JPEG, PNG, or WebP image. Pinterest URL fetching is unavailable without an authorized integration.', 422, true, 'IMAGE_REQUIRED');
  }

  const prepared = await prepareInspirationImage(req.file.buffer);
  const ai = getAIProvider();
  const rawAttributes = await ai.analyzeInspirationImage(`data:image/webp;base64,${prepared.bytes.toString('base64')}`);
  const parsed = inspirationAttributesSchema.safeParse(rawAttributes);
  if (!parsed.success) {
    throw new AppError('The AI provider returned an invalid inspiration analysis. Please retry.', 502, true, 'AI_MALFORMED_INSPIRATION_RESPONSE');
  }

  // Upload only after successful analysis. A failed database write removes
  // the new asset rather than leaving an unowned copy behind.
  const stored = await storeInspirationImage(prepared, userId);
  const id = crypto.randomUUID();
  try {
    await prisma.$transaction(async (tx) => {
      // Fetch live owned items after inference; the model receives no wardrobe IDs.
      const wardrobe = await tx.clothingItem.findMany({
        where: { userId, archived: false },
        select: { id: true, name: true, category: true, colors: true, pattern: true,
          silhouette: true, fit: true, aesthetics: true },
      });
      const analysis = matchInspirationAttributes(parsed.data, wardrobe, ai.name, ai.model);
      await tx.inspirationImage.create({
        data: {
          id, userId, title: parsed.data.detectedStyle,
          imageUrl: `/api/v1/inspiration/${id}/image`,
          imageProviderId: stored.imageProviderId,
          storageProvider: stored.storageProvider,
          storageKey: stored.storageKey,
          contentType: prepared.contentType,
          byteSize: prepared.byteSize,
          width: prepared.width,
          height: prepared.height,
          imageHash: prepared.imageHash,
          analysis: { ...parsed.data, provider: ai.name, model: ai.model } as object,
          matches: { create: {
            userId,
            similarity: analysis.recreationSuggestion.overallScore,
            matchMethod: analysis.matchingMethod,
            matchedItems: analysis.matchedItems as object,
            missingItems: analysis.missingPieces as object,
            recreation: analysis.recreationSuggestion as object,
          } },
        },
      });
      await tx.aIStylingHistory.create({
        data: {
          userId,
          requestType: 'inspiration_analysis',
          input: { imageHash: prepared.imageHash } as object,
          output: { detectedStyle: parsed.data.detectedStyle, matchingMethod: analysis.matchingMethod } as object,
          provider: ai.name,
          model: ai.model,
        },
      });
    });
  } catch (error) {
    try { await deleteStoredInspirationImage(stored); }
    catch { logger.warn('Could not clean up inspiration image after database failure.'); }
    throw error;
  }

  const detail = await detailForUser(id, userId);
  ApiResponse.created(res, detail, 'Inspiration analysed and saved. Matches are approximate attribute comparisons.');
}

export async function getSavedInspirations(req: Request, res: Response): Promise<void> {
  const userId = userIdFrom(req);
  const { page } = pageSchema.parse(req.query);
  const perPage = 12;
  const [total, inspirations] = await Promise.all([
    prisma.inspirationImage.count({ where: { userId } }),
    prisma.inspirationImage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: { id: true, title: true, imageUrl: true, createdAt: true,
        matches: { where: { userId }, orderBy: { createdAt: 'desc' }, take: 1,
          select: { similarity: true, matchMethod: true } } },
    }),
  ]);
  ApiResponse.paginated(res, inspirations.map((item) => ({
    id: item.id, title: item.title, imageUrl: item.imageUrl, createdAt: item.createdAt,
    attributeScore: item.matches[0]?.similarity ?? null,
    matchingMethod: item.matches[0]?.matchMethod ?? null,
  })), { page, perPage, total, totalPages: Math.ceil(total / perPage) });
}

export async function getInspiration(req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, await detailForUser(param(req, 'id'), userIdFrom(req)));
}

export async function getInspirationImage(req: Request, res: Response): Promise<void> {
  const inspiration = await ownedInspiration(param(req, 'id'), userIdFrom(req));
  if (!inspiration.storageProvider || !inspiration.storageKey) {
    throw new AppError('Stored inspiration image is unavailable.', 404);
  }
  res.setHeader('Cache-Control', 'private, no-store');
  if (inspiration.storageProvider === 'local') {
    const bytes = await readLocalInspirationImage(inspiration.storageKey);
    res.type('image/webp').send(bytes);
    return;
  }
  if (inspiration.storageProvider === 'cloudinary') {
    res.redirect(302, await cloudinaryInspirationDownloadUrl(inspiration.storageKey));
    return;
  }
  throw new AppError('Stored inspiration image is unavailable.', 404);
}

export async function deleteInspiration(req: Request, res: Response): Promise<void> {
  const userId = userIdFrom(req);
  const inspiration = await ownedInspiration(param(req, 'id'), userId);
  await prisma.inspirationImage.delete({ where: { id: inspiration.id } });
  if ((inspiration.storageProvider === 'local' || inspiration.storageProvider === 'cloudinary') && inspiration.storageKey) {
    try {
      await deleteStoredInspirationImage({ storageProvider: inspiration.storageProvider, storageKey: inspiration.storageKey });
    } catch {
      logger.warn('Inspiration asset cleanup failed after record deletion.');
    }
  }
  ApiResponse.noContent(res);
}
