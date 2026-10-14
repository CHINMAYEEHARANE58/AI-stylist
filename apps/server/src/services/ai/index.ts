/**
 * AI provider factory.
 * Uses a real provider by default. The mock provider is an explicit,
 * development-only opt-in so production never returns invented analysis.
 */
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import type { AIProvider } from './types';
import { MockAIProvider } from './mockProvider';
import { AppError } from '../../utils/AppError';
import { createOpenAIProvider } from './openaiProvider';

let _provider: AIProvider | null = null;

class UnavailableAIProvider implements AIProvider {
  readonly name = 'unconfigured';
  readonly model = 'unconfigured';
  private unavailable(): never {
    throw new AppError('AI analysis is not configured. Add a server-side AI provider key and try again.', 503, true, 'AI_NOT_CONFIGURED');
  }
  async analyzeClothingImage(): Promise<never> { return this.unavailable(); }
  async generateOutfits(): Promise<never> { return this.unavailable(); }
  async styleThisItem(): Promise<never> { return this.unavailable(); }
  async analyzeInspirationImage(): Promise<never> { return this.unavailable(); }
  async chat(): Promise<never> { return this.unavailable(); }
}

export function getAIProvider(): AIProvider {
  if (_provider) {
    return _provider;
  }

  if (env.AI_PROVIDER === 'mock') {
    if (env.NODE_ENV !== 'development') {
      throw new AppError('The development AI mock cannot be used outside development.', 503, true, 'AI_MOCK_DISABLED');
    }
    logger.warn('AI: using explicitly configured development mock provider. Results are not real AI analysis.');
    _provider = new MockAIProvider();
    return _provider;
  }

  if (env.OPENAI_API_KEY) {
    _provider = createOpenAIProvider(env.OPENAI_API_KEY);
    return _provider;
  }

  logger.warn('AI: no server-side provider key configured. AI analysis is disabled.');
  _provider = new UnavailableAIProvider();
  return _provider;
}

export { type AIProvider } from './types';
export type {
  ClothingAnalysis, GeneratedOutfit, OutfitGenerationInput, OutfitGenerationResult,
  StyleThisItemResult, StyleLook, InspirationAttributes, InspirationAnalysisResult, MatchedItem,
  ChatMessage, StylistChatResult, WardrobeItemSummary,
} from './types';
