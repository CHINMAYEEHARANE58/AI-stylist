import { env } from './env';

export function isAllowedOrigin(origin: string): boolean {
  if (env.ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }
  return env.NODE_ENV === 'development' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}
