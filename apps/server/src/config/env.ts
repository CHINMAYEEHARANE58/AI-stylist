import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().optional(),

  JWT_SECRET: z.string().min(8).default('closetai-dev-secret-change-in-production'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001')
    .transform((s) => s.split(',').map((o) => o.trim())),

  FRONTEND_URL: z.string().default('http://localhost:3000'),

  EMAIL_FROM: z.string().min(3).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  IMAGE_STORAGE_VISIBILITY: z.enum(['public', 'private']).default('public'),
  INSPIRATION_STORAGE_PROVIDER: z.enum(['cloudinary', 'local']).default('cloudinary'),
  INSPIRATION_LOCAL_DIR: z.string().min(1).optional(),

  // AI providers
  AI_PROVIDER: z.enum(['openai', 'mock']).default('openai'),
  AI_VISION_MODEL: z.string().min(1).default('gpt-4o'),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(30_000),
  AI_ANALYSIS_CACHE_MINUTES: z.coerce.number().int().min(1).max(10_080).default(1_440),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  GEMINI_API_KEY: z.string().optional(),

  // Weather
  WEATHER_API_KEY: z.string().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
