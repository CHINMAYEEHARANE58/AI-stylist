import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { connectDatabase } from './config/db';
import { logger } from './config/logger';
import { applySecurityMiddleware } from './middleware/security';
import { requestLogger } from './middleware/requestLogger';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import v1Routes from './routes/index';

async function bootstrap(): Promise<void> {
  const app = express();

  // ── Trust proxy (for rate-limiting behind nginx/ALB) ──────────────────
  app.set('trust proxy', 1);

  // ── Security middleware (helmet, cors, compression) ───────────────────
  applySecurityMiddleware(app);

  // ── Body parsers ──────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ── HTTP request logging ──────────────────────────────────────────────
  app.use(requestLogger);

  // ── Global rate limiter ───────────────────────────────────────────────
  app.use('/api', apiLimiter);

  // ── API v1 ────────────────────────────────────────────────────────────
  app.use('/api/v1', v1Routes);

  // ── Root ──────────────────────────────────────────────────────────────
  app.get('/', (_req, res) => {
    res.json({
      name:    'ClosetAI API',
      version: 'v1',
      health:  '/api/v1/health',
      docs:    '/api/v1/health',
    });
  });

  // ── 404 ───────────────────────────────────────────────────────────────
  app.use(notFound);

  // ── Centralized error handler (must be last) ──────────────────────────
  app.use(errorHandler);

  // ── Database ──────────────────────────────────────────────────────────
  await connectDatabase();

  // ── Start server ──────────────────────────────────────────────────────
  app.listen(env.PORT, () => {
    logger.info(`ClosetAI API  ▶  http://localhost:${env.PORT}`);
    logger.info(`Health check  ▶  http://localhost:${env.PORT}/api/v1/health`);
    logger.info(`Environment   ▶  ${env.NODE_ENV}`);
  });
}

bootstrap().catch((err: Error) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});
