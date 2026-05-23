import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { ShopifyService } from '../services/shopify.service';
import { logger, logErrorThrottled } from '../utils/logger';

export function startWorkers() {
  // Log status but initialize workers anyway so they connect automatically when Redis comes online
  if (redisConnection.status !== 'ready' && redisConnection.status !== 'connecting') {
    logger.warn('Redis connection is offline. Workers will retry connecting automatically in the background.');
  }

  // 1. Shopify Product & Quantity Sync Worker
  const shopifyWorker = new Worker(
    'shopify-sync',
    async (job) => {
      const { bookId, action } = job.data;
      logger.info(`Processing Shopify Sync Worker Job [${job.id}] - Book: ${bookId}, Action: ${action}`);

      try {
        if (action === 'create') {
          await ShopifyService.createProduct(bookId);
        } else if (action === 'update') {
          await ShopifyService.updateProduct(bookId);
        } else if (action === 'delete') {
          await ShopifyService.deleteProduct(bookId);
        }
      } catch (err: any) {
        logger.error(`Shopify sync worker error on Book ${bookId}: ${err.message}`);
        throw err; // throw to trigger BullMQ retry
      }
    },
    { connection: redisConnection }
  );

  // 2. Transact Email Notification Worker
  const emailWorker = new Worker(
    'email-queue',
    async (job) => {
      const { to, subject, body } = job.data;
      logger.info(`Processing Transact Email Worker Job [${job.id}] to: ${to}`);
      // Log notification out to winston. Nodemailer configuration can be attached here.
      logger.info(`[Email Dispatch Simulation] TO: ${to} | SUBJECT: "${subject}" | BODY: "${body.substring(0, 100)}..."`);
    },
    { connection: redisConnection }
  );

  shopifyWorker.on('completed', (job) => {
    logger.info(`Shopify Sync Job ${job.id} Completed successfully.`);
  });

  shopifyWorker.on('failed', (job, err) => {
    logger.error(`Shopify Sync Job ${job?.id} Failed: ${err.message}`);
  });

  shopifyWorker.on('error', () => {});

  emailWorker.on('completed', (job) => {
    logger.info(`Email Send Job ${job.id} Completed.`);
  });

  emailWorker.on('error', () => {});

  logger.info('Initialized BullMQ background worker listeners.');
}
