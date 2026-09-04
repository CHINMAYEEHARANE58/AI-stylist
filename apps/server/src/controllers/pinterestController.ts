import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { getAIProvider } from '../services/ai/index';
import { uploadImage } from '../services/imageService';

function param(req: Request, key: string): string {
  const v = req.params[key];
  if (!v || Array.isArray(v)) throw new Error(`Missing param: ${key}`);
  return v;
}

const urlAnalysisSchema = z.object({
  imageUrl: z.string().url().max(2048),
}).strict();

// ── Helper ─────────────────────────────────────────────────────────────

async function getWardrobeForAI(userId: string) {
  const items = await prisma.clothingItem.findMany({
    where: { userId, archived: false },
    select: {
      id: true, name: true, category: true, colors: true,
      seasons: true, occasions: true, aesthetics: true,
      pattern: true, material: true,
    },
    take: 60,
  });
  return items.map((w) => ({
    id: w.id,
    name: w.name,
    category: w.category,
    colors: w.colors,
    seasons: w.seasons,
    occasions: w.occasions,
    aesthetics: w.aesthetics,
    pattern: w.pattern ?? undefined,
    material: w.material ?? undefined,
  }));
}

// ── Controllers ────────────────────────────────────────────────────────

export async function analyzeInspirationImage(req: Request, res: Response): Promise<void> {
  const userId   = req.user!.id;
  const wardrobe = await getWardrobeForAI(userId);
  const ai       = getAIProvider();

  let imageUrl: string;
  let providerId: string | undefined;

  if (req.file) {
    // Uploaded file
    const uploaded = await uploadImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      userId,
      'inspiration',
    );
    imageUrl   = uploaded.url;
    providerId = uploaded.providerId;
  } else {
    // URL provided
    const { imageUrl: url } = urlAnalysisSchema.parse(req.body);

    // Basic SSRF guard: only allow https
    if (!url.startsWith('https://')) {
      throw new AppError('Only HTTPS image URLs are accepted.', 422);
    }
    imageUrl = url;
  }

  const analysis = await ai.analyzeInspirationImage(imageUrl, wardrobe);

  // Enrich matched items with full data
  const matchedIds = analysis.matchedItems.map((m) => m.clothingItemId);
  const matchedItems = matchedIds.length > 0
    ? await prisma.clothingItem.findMany({ where: { id: { in: matchedIds }, userId } })
    : [];
  const itemMap = new Map(matchedItems.map((i) => [i.id, i]));

  // Persist inspiration image
  const inspiration = await prisma.inspirationImage.create({
    data: {
      userId,
      imageUrl,
      imageProviderId: providerId,
      analysis: analysis as object,
    },
  });

  // Persist match record
  await prisma.inspirationMatch.create({
    data: {
      inspirationImageId: inspiration.id,
      userId,
      similarity: analysis.recreationSuggestion.overallScore,
      matchedItems: analysis.matchedItems as object,
      missingItems: analysis.missingCategories as object,
      recreation:   analysis.recreationSuggestion as object,
    },
  });

  void prisma.aIStylingHistory.create({
    data: {
      userId,
      requestType: 'inspiration_analysis',
      input: { imageUrl } as object,
      output: analysis as object,
      provider: analysis.provider,
      model: analysis.model,
    },
  });

  ApiResponse.success(res, {
    inspirationId: inspiration.id,
    imageUrl,
    analysis: {
      ...analysis,
      matchedItems: analysis.matchedItems.map((m) => ({
        ...m,
        item: itemMap.get(m.clothingItemId),
      })),
    },
  }, 'Inspiration analysed.');
}

export async function getSavedInspirations(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const page   = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10));
  const perPage = 12;

  const [total, inspirations] = await Promise.all([
    prisma.inspirationImage.count({ where: { userId } }),
    prisma.inspirationImage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: { matches: { orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
  ]);

  ApiResponse.paginated(res, inspirations, {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  });
}

export async function deleteInspiration(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = param(req, 'id');
  const existing = await prisma.inspirationImage.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError('Inspiration not found.', 404);
  await prisma.inspirationImage.delete({ where: { id: existing.id } });
  ApiResponse.noContent(res);
}
