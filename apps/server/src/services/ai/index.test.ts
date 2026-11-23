import { beforeEach, describe, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({ AI_PROVIDER: 'gemini', GEMINI_API_KEY: '', OPENAI_API_KEY: 'other-provider-key',
  GEMINI_MODEL: 'test-gemini-model', NODE_ENV: 'test' }));
vi.mock('../../config/env', () => ({ env: config }));

describe('explicit AI provider selection', () => {
  beforeEach(() => { vi.resetModules(); config.GEMINI_API_KEY = ''; });

  it('does not fall back to OpenAI when the selected Gemini key is missing', async () => {
    const { getAIProvider } = await import('./index');
    expect(getAIProvider().name).toBe('unconfigured');
    await expect(getAIProvider().analyzeClothingImage('unused')).rejects.toMatchObject({ code: 'AI_NOT_CONFIGURED' });
  });

  it('selects Gemini with its own model and key', async () => {
    config.GEMINI_API_KEY = 'test-key';
    const { getAIProvider } = await import('./index');
    expect(getAIProvider().name).toBe('gemini');
    expect(getAIProvider().model).toBe('test-gemini-model');
  });
});
