import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

let databaseConnected = false;

export async function connectDatabase(): Promise<void> {
  if (!env.DATABASE_URL) {
    logger.warn('DATABASE_URL is not set — running with development data fallbacks.');
    return;
  }

  try {
    await prisma.$connect();
    databaseConnected = true;
    logger.info('PostgreSQL connected through Prisma.');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`PostgreSQL connection failed — running with development data fallbacks. (${message})`);
  }
}

export function isDatabaseConnected(): boolean {
  return databaseConnected;
}
