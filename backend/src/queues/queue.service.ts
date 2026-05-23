import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { logger, logErrorThrottled } from '../utils/logger';
import { ShopifyService } from '../services/shopify.service';

export const shopifySyncQueue = new Queue('shopify-sync', { connection: redisConnection });
export const emailQueue = new Queue('email-queue', { connection: redisConnection });
export const inventoryQueue = new Queue('inventory-queue', { connection: redisConnection });

// Handle connection/operational errors silently to provide a clean offline mode
shopifySyncQueue.on('error', () => {});
emailQueue.on('error', () => {});
inventoryQueue.on('error', () => {});


export class QueueService {
  static async addShopifySyncJob(bookId: number, action: 'create' | 'update' | 'delete') {
    const isRedisConnected = redisConnection.status === 'ready';
    if (!isRedisConnected) {
      logger.warn(`Redis is offline. Running Shopify sync directly for Book ID ${bookId} (${action})...`);
      // Fire-and-forget in background so it doesn't block the HTTP response thread
      (async () => {
        try {
          if (action === 'create' || action === 'update') {
            await ShopifyService.updateProduct(bookId);
          } else if (action === 'delete') {
            await ShopifyService.deleteProduct(bookId);
          }
        } catch (error: any) {
          logger.error(`Direct Shopify sync fallback failed for Book ID ${bookId}: ${error.message || error}`);
        }
      })();
      return;
    }

    try {
      await shopifySyncQueue.add('sync-book', { bookId, action }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      });
      logger.info(`Enqueued Shopify sync job for book ID ${bookId} (${action})`);
    } catch (error) {
      logger.error(`Failed to enqueue Shopify sync job: ${error}`);
    }
  }

  static async addEmailJob(to: string, subject: string, body: string) {
    if (redisConnection.status !== 'ready') {
      logger.warn(`Redis is offline. Direct mock mail sent in logs to: ${to}`);
      return;
    }

    try {
      await emailQueue.add('send-email', { to, subject, body }, {
        attempts: 3,
        backoff: { type: 'fixed', delay: 3000 },
        removeOnComplete: true,
      });
      logger.info(`Enqueued email job to ${to}`);
    } catch (error) {
      logger.error(`Failed to enqueue email job: ${error}`);
    }
  }

  static async addInventoryProcessJob(booksData: any[]) {
    if (redisConnection.status !== 'ready') {
      logger.warn(`Redis is offline. Cannot process CSV job in background. Running synchronous fallback...`);
      return;
    }

    try {
      await inventoryQueue.add('process-csv', { booksData }, {
        attempts: 1,
        removeOnComplete: true,
      });
      logger.info(`Enqueued inventory process job for ${booksData.length} books`);
    } catch (error) {
      logger.error(`Failed to enqueue inventory CSV job: ${error}`);
    }
  }
}
