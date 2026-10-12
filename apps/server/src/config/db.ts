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
    logger.warn('DATABASE_URL is not set; database-backed routes are unavailable.');
    return;
  }

  try {
    await prisma.$connect();
    databaseConnected = true;
    logger.info('PostgreSQL connected through Prisma.');
  } catch {
    databaseConnected = false;
    logger.warn('PostgreSQL connection failed; database-backed routes are unavailable.');
  }
}

export function isDatabaseConnected(): boolean {
  return databaseConnected;
}

/** A credential-safe readiness probe used by the health endpoint. */
export async function checkDatabaseConnection(): Promise<boolean> {
  if (!env.DATABASE_URL) {
    databaseConnected = false;
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseConnected = true;
    return true;
  } catch {
    databaseConnected = false;
    return false;
  }
}
