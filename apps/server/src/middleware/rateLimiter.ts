import rateLimit from 'express-rate-limit';

/** General API rate limiter — 200 req / 15 min */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again in a few minutes.',
  },
});

/** Strict limiter for auth endpoints — 20 req / 15 min */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
  },
});

/** Restricts expensive multipart image handling independently from general API traffic. */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many upload attempts. Please try again later.' },
});

/** Protects model-backed outfit generation from accidental or repeated requests. */
export const outfitGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many outfit generations. Please wait a few minutes and try again.', code: 'OUTFIT_GENERATION_RATE_LIMITED' },
});

/** Bounds city lookups against the configured weather-provider quota. */
export const weatherLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many weather requests. Please try again later.', code: 'WEATHER_RATE_LIMITED' },
});
