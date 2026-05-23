import Redis from 'ioredis';
import { logger, logErrorThrottled } from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Setup Redis Client. Use lazyConnect to prevent Express from crashing if Redis is offline
export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redisConnection.connect().catch((err) => {
  logger.warn(`Redis connection failed to initialize: ${err.message}. background workers will be disabled.`);
});

redisConnection.on('connect', () => {
  logger.info('Connected to Redis server.');
});

redisConnection.on('error', () => {
  // Silent in offline mode
});
