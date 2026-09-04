import morgan from 'morgan';
import { logger } from '../config/logger';
import { env } from '../config/env';

// Pipe morgan output into winston
const stream = {
  write: (message: string) => logger.http(message.trim()),
};

export const requestLogger = morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream,
  skip: (_req, res) => env.NODE_ENV === 'production' && res.statusCode < 400,
});
