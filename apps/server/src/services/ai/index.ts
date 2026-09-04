/**
 * AI provider factory.
 * Selects the real provider based on configured API keys,
 * falls back to MockAIProvider in development if none are set.
 */
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import type { AIProvider } from './types';
import { MockAIProvider } from './mockProvider';

let _provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_provider) return _provider;

  if (env.OPENAI_API_KEY) {
    // Lazy import to avoid loading openai module unless needed
    const { createOpenAIProvider } = require('./openaiProvider') as typeof import('./openaiProvider');
    _provider = createOpenAIProvider(env.OPENAI_API_KEY);
    return _provider;
  }

  logger.warn('AI: No API key configured — using mock development provider. Set OPENAI_API_KEY to enable real AI.');
  _provider = new MockAIProvider();
  return _provider;
}

export { type AIProvider } from './types';
export type {
  ClothingAnalysis, GeneratedOutfit, OutfitGenerationInput, OutfitGenerationResult,
  StyleThisItemResult, StyleLook, InspirationAnalysisResult, MatchedItem,
  ChatMessage, StylistChatResult, WardrobeItemSummary,
} from './types';
