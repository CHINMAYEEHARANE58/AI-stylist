import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/ApiResponse';
import { getAIProvider } from '../services/ai/index';
import type { ChatMessage } from '../services/ai/types';

const chatSchema = z.object({
  message: z.string().min(1).max(500).trim(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(1000),
  })).max(20).default([]),
}).strict();

export async function chat(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const { message, history } = chatSchema.parse(req.body);

  // Get user's wardrobe for context
  const wardrobeItems = await prisma.clothingItem.findMany({
    where: { userId, archived: false },
    select: {
      id: true, name: true, category: true, colors: true,
      seasons: true, occasions: true, aesthetics: true,
      pattern: true, material: true,
    },
    take: 40,
  });

  const wardrobeContext = wardrobeItems.map((w) => ({
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

  const userPrefs = await prisma.userPreference.findUnique({
    where: { userId },
    select: { preferredAesthetics: true, favoriteColors: true },
  });

  // Build message history (never expose system prompts)
  const messages: ChatMessage[] = [
    ...history,
    { role: 'user', content: message },
  ];

  const ai = getAIProvider();
  const result = await ai.chat(
    messages,
    wardrobeContext,
    userPrefs
      ? { preferredAesthetics: userPrefs.preferredAesthetics, favoriteColors: userPrefs.favoriteColors }
      : undefined,
  );

  // Persist to history
  void prisma.aIStylingHistory.create({
    data: {
      userId,
      requestType: 'chat',
      input: { message, historyLength: history.length } as object,
      output: result as object,
      provider: result.provider,
      model: result.model,
    },
  });

  ApiResponse.success(res, {
    reply: result.reply,
    suggestions: result.suggestions,
    provider: result.provider,
  });
}
