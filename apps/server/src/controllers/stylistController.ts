import type { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import { getAIProvider } from '../services/ai/index';
import { selectRelevantWardrobe, stylistChatOutputSchema, validateStylistChatResult } from '../services/ai/stylistChat';
import type { ChatMessage, WardrobeItemSummary } from '../services/ai/types';

const chatSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  conversationId: z.string().cuid().optional(),
}).strict();
const idSchema = z.object({ id: z.string().cuid() });

function authenticatedUserId(req: Request): string {
  if (!req.user) { throw new AppError('Authentication required.', 401); }
  return req.user.id;
}

function toContext(item: {
  id: string; name: string; category: string; colors: string[]; seasons: string[];
  occasions: string[]; aesthetics: string[]; pattern: string | null; material: string | null;
}): WardrobeItemSummary {
  return { ...item, pattern: item.pattern ?? undefined, material: item.material ?? undefined };
}

export async function listConversations(req: Request, res: Response): Promise<void> {
  const userId = authenticatedUserId(req);
  const conversations = await prisma.stylistConversation.findMany({
    where: { userId },
    select: { id: true, title: true, createdAt: true, updatedAt: true,
      _count: { select: { messages: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
  ApiResponse.success(res, conversations.map(({ _count, ...conversation }) => ({
    ...conversation, messageCount: _count.messages,
  })));
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  const { id } = idSchema.parse(req.params);
  const userId = authenticatedUserId(req);
  const conversation = await prisma.stylistConversation.findFirst({
    where: { id, userId },
    select: { id: true, title: true, createdAt: true, updatedAt: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 100,
        select: { id: true, role: true, content: true, result: true, provider: true, model: true, createdAt: true } } },
  });
  if (!conversation) { throw new AppError('Conversation not found.', 404); }

  const itemIds = [...new Set(conversation.messages.flatMap((entry) => {
    const parsed = stylistChatOutputSchema.safeParse(entry.result);
    return parsed.success ? parsed.data.outfits.flatMap((outfit) => outfit.clothingItemIds) : [];
  }))];
  const items = itemIds.length ? await prisma.clothingItem.findMany({
    where: { id: { in: itemIds }, userId, archived: false },
    select: { id: true, name: true, category: true, imageUrl: true },
  }) : [];
  const itemMap = new Map(items.map((item) => [item.id, item]));
  ApiResponse.success(res, { ...conversation, messages: conversation.messages.reverse().map((entry) => {
    const parsed = stylistChatOutputSchema.safeParse(entry.result);
    return { ...entry, result: parsed.success ? {
      ...parsed.data,
      outfits: parsed.data.outfits.map((outfit) => ({
        ...outfit, items: outfit.clothingItemIds.map((itemId) => itemMap.get(itemId) ?? null),
      })),
    } : null };
  }) });
}

export async function deleteConversation(req: Request, res: Response): Promise<void> {
  const { id } = idSchema.parse(req.params);
  const removed = await prisma.stylistConversation.deleteMany({ where: { id, userId: authenticatedUserId(req) } });
  if (removed.count === 0) { throw new AppError('Conversation not found.', 404); }
  ApiResponse.noContent(res);
}

export async function chat(req: Request, res: Response): Promise<void> {
  const userId = authenticatedUserId(req);
  const { message, conversationId } = chatSchema.parse(req.body);
  const provider = getAIProvider(); // Fails explicitly when real AI is unconfigured.

  const conversation = conversationId ? await prisma.stylistConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true, messages: { orderBy: { createdAt: 'desc' }, take: 12,
      select: { role: true, content: true } }, _count: { select: { messages: true } } },
  }) : null;
  if (conversationId && !conversation) { throw new AppError('Conversation not found.', 404); }
  if (conversation && conversation._count.messages >= 200) {
    throw new AppError('This conversation is full. Start a new one to continue.', 422, true, 'CHAT_LIMIT_REACHED');
  }

  const dailyCount = await prisma.aIStylingHistory.count({
    where: { userId, requestType: 'chat', createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  if (dailyCount >= 100) {
    throw new AppError('Daily stylist limit reached. Please return tomorrow.', 429, true, 'AI_DAILY_LIMIT');
  }

  const [wardrobeItems, userPrefs] = await Promise.all([
    prisma.clothingItem.findMany({ where: { userId, archived: false },
      select: { id: true, name: true, category: true, colors: true, seasons: true,
        occasions: true, aesthetics: true, pattern: true, material: true },
      orderBy: { updatedAt: 'desc' }, take: 500 }),
    prisma.userPreference.findUnique({ where: { userId },
      select: { preferredAesthetics: true, favoriteColors: true, preferredCategories: true,
        preferredOccasions: true, preferredSeasons: true, fitPreferences: true, styleDislikes: true } }),
  ]);
  const preferences = userPrefs ?? undefined;
  const wardrobeContext = selectRelevantWardrobe(wardrobeItems.map(toContext), message, preferences);
  const messages: ChatMessage[] = [
    ...(conversation?.messages ?? []).reverse().map((entry) => ({
      role: entry.role === 'USER' ? 'user' as const : 'assistant' as const,
      content: entry.content,
    })),
    { role: 'user', content: message },
  ];

  const result = await provider.chat(messages, wardrobeContext, preferences);
  const validated = validateStylistChatResult({
    reply: result.reply, outfits: result.outfits,
    shoppingSuggestions: result.shoppingSuggestions, suggestions: result.suggestions,
  }, wardrobeContext);
  const referencedIds = [...new Set(validated.outfits.flatMap((outfit) => outfit.clothingItemIds))];
  const ownedItems = referencedIds.length ? await prisma.clothingItem.findMany({
    where: { id: { in: referencedIds }, userId, archived: false },
    select: { id: true, name: true, category: true, imageUrl: true },
  }) : [];
  if (ownedItems.length !== referencedIds.length) {
    throw new AppError('A suggested clothing item is no longer available. Please retry.', 409, true, 'WARDROBE_CHANGED');
  }

  const savedId = await prisma.$transaction(async (tx) => {
    const id = conversationId ?? (await tx.stylistConversation.create({
      data: { userId, title: message.slice(0, 120) }, select: { id: true },
    })).id;
    await tx.stylistMessage.createMany({ data: [
      { conversationId: id, role: 'USER', content: message },
      { conversationId: id, role: 'ASSISTANT', content: validated.reply,
        result: validated, provider: result.provider, model: result.model },
    ] });
    await tx.aIStylingHistory.create({ data: {
      userId, requestType: 'chat', input: { conversationId: id },
      output: { outfitCount: validated.outfits.length, ownedItemCount: referencedIds.length },
      provider: result.provider, model: result.model,
    } });
    if (conversationId) {
      await tx.stylistConversation.update({ where: { id }, data: { updatedAt: new Date() } });
    }
    return id;
  });
  const itemMap = new Map(ownedItems.map((item) => [item.id, item]));
  ApiResponse.success(res, { conversationId: savedId, ...validated,
    outfits: validated.outfits.map((outfit) => ({
      ...outfit, items: outfit.clothingItemIds.map((id) => itemMap.get(id)),
    })), provider: result.provider, model: result.model,
  });
}
