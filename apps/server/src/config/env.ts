import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/closetai'),

  JWT_SECRET: z.string().min(8).default('closetai-dev-secret-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  ALLOWED_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001')
    .transform((s) => s.split(',').map((o) => o.trim())),

  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  WEATHER_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
