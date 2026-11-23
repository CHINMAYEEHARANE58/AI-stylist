import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { OpenAIProvider } from './openaiProvider';

type Message = { role: string; content: string | Array<{ type: string; [key: string]: unknown }> };
type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

function partsFor(content: Message['content']): Part[] {
  if (typeof content === 'string') {return [{ text: content }];}
  return content.map((part): Part => {
    if (part.type === 'text' && typeof part.text === 'string') {return { text: part.text };}
    const url = (part.image_url as { url?: unknown } | undefined)?.url;
    const image = typeof url === 'string' && /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(url);
    if (!image) {throw new AppError('A validated clothing image is required.', 422, true, 'INVALID_AI_IMAGE');}
    return { inlineData: { mimeType: image[1], data: image[2] } };
  });
}

/** Reuses the styling prompts and Zod validators with Google's native content API. */
export class GeminiProvider extends OpenAIProvider {
  constructor(private readonly geminiKey: string, model = env.GEMINI_MODEL) {
    super(geminiKey, model, { name: 'gemini' });
  }

  protected async complete(messages: Message[], model = this.model): Promise<string> {
    const systemParts = messages.filter((message) => message.role === 'system').flatMap((message) => partsFor(message.content));
    const contents = messages.filter((message) => message.role !== 'system').map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user', parts: partsFor(message.content),
    }));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.geminiKey },
        body: JSON.stringify({
          ...(systemParts.length ? { systemInstruction: { parts: systemParts } } : {}),
          contents,
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 4096, temperature: 0.4 },
        }),
        signal: controller.signal,
      });
      // Raw provider errors can contain private request details; expose only safe codes.
      if (response.status === 429) {throw new AppError('AI analysis is temporarily rate limited. Please try again shortly.', 429, true, 'AI_RATE_LIMITED');}
      if (response.status === 401 || response.status === 403) {throw new AppError('The AI provider is not configured correctly.', 503, true, 'AI_PROVIDER_AUTH_FAILED');}
      if (response.status >= 500) {throw new AppError('Gemini is temporarily unavailable. Please retry the scan.', 503, true, 'AI_PROVIDER_UNAVAILABLE');}
      if (!response.ok) {throw new AppError('The AI provider could not analyse this photo. Please try another image.', 502, true, 'AI_PROVIDER_ERROR');}

      const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }> };
      const text = data.candidates?.[0]?.content?.parts?.filter((part) => !part.thought && typeof part.text === 'string').map((part) => part.text).join('');
      if (!text) {throw new AppError('The AI provider returned no item details. Please retry with a clear clothing photo.', 502, true, 'AI_MALFORMED_RESPONSE');}
      return text;
    } catch (error) {
      if (error instanceof AppError) {throw error;}
      if ((error as Error).name === 'AbortError') {throw new AppError('The scan timed out. Please retry the analysis.', 504, true, 'AI_TIMEOUT');}
      throw new AppError('Gemini could not be reached. Please retry the scan.', 503, true, 'AI_PROVIDER_UNAVAILABLE');
    } finally {
      clearTimeout(timer);
    }
  }
}
