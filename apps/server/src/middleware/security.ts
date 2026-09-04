import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import type { Application } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';

export function applySecurityMiddleware(app: Application): void {
  // ── Helmet (sets secure HTTP headers) ────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: env.NODE_ENV === 'production',
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) {
        callback(null, true);
        return;
      }
      if (env.ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400, // 24 h preflight cache
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // ── Compression ───────────────────────────────────────────────────────
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6,
      threshold: 1024,
    }),
  );
}
