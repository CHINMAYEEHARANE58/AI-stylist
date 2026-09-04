import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectDatabase(): Promise<void> {
  if (!env.MONGODB_URI) {
    logger.warn('MONGODB_URI is not set — running without database connection.');
    return;
  }

  try {
    mongoose.set('strictQuery', true);

    mongoose.connection.on('connected', () =>
      logger.info(`MongoDB connected → ${mongoose.connection.name}`),
    );
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected.'));
    mongoose.connection.on('error', (err: Error) =>
      logger.error(`MongoDB error: ${err.message}`),
    );

    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`MongoDB connection failed — running with mock data. (${message})`);
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
