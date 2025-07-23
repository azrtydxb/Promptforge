#!/usr/bin/env tsx

/**
 * TypeScript worker startup script
 * This runs with tsx to handle TypeScript and module imports properly
 */

import { embeddingWorker } from '../src/lib/queues/embedding-queue';
import { logger } from '../src/lib/logger';

async function startWorker() {
  try {
    logger.info('Starting embedding worker...');
    
    // The worker is already created with autorun: true, so it's already running
    logger.info('✅ Embedding worker started successfully');
    logger.info('🔄 Waiting for jobs...');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down worker gracefully...');
      await embeddingWorker.close();
      logger.info('Worker closed');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Shutting down worker gracefully...');
      await embeddingWorker.close();
      logger.info('Worker closed');
      process.exit(0);
    });
    
    // Keep the process alive
    process.stdin.resume();
    
  } catch (error) {
    logger.error('Failed to start worker', { error });
    process.exit(1);
  }
}

startWorker();