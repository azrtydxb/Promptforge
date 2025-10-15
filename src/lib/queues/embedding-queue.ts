import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '@/lib/logger';
import {
  updatePromptEmbeddings,
  updateTemplateEmbeddings,
  generateEmbedding,
  preparePromptText,
  prepareTemplateText
} from '@/services/embedding-service';
import { db } from '@/lib/db';

// Queue configuration
const QUEUE_NAME = 'embeddings';

// Create a dedicated Redis connection for BullMQ
// BullMQ has specific requirements for Redis connections
const bullMQConnection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'redispassword',
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  connectTimeout: 10000, // 10 seconds timeout
  // Add retry strategy with max attempts to prevent infinite loops
  retryStrategy(times: number) {
    if (times > 10) {
      // Stop retrying after 10 attempts
      logger.error('BullMQ Redis max retry attempts reached, stopping reconnection');
      return null;
    }
    // Exponential backoff: 50ms, 100ms, 200ms... up to 2000ms
    const delay = Math.min(times * 50, 2000);
    logger.info(`BullMQ Redis retry attempt ${times}, waiting ${delay}ms`);
    return delay;
  },
});

// Log connection events for debugging
bullMQConnection.on('connect', () => {
  logger.info('BullMQ Redis connection established');
});

bullMQConnection.on('error', (err) => {
  logger.error('BullMQ Redis connection error', { error: err });
});

bullMQConnection.on('close', () => {
  logger.info('BullMQ Redis connection closed');
});

// Create the queue
export const embeddingQueue = new Queue(QUEUE_NAME, {
  connection: bullMQConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100, // Keep max 100 completed jobs
    },
    removeOnFail: {
      age: 24 * 3600, // Keep failed jobs for 24 hours
    },
  },
});

// Job types
export enum EmbeddingJobType {
  UPDATE_PROMPT = 'update_prompt',
  UPDATE_TEMPLATE = 'update_template',
  BATCH_UPDATE_PROMPTS = 'batch_update_prompts',
  BATCH_UPDATE_TEMPLATES = 'batch_update_templates',
  UPDATE_ALL_USER_PROMPTS = 'update_all_user_prompts',
}

interface EmbeddingJobData {
  type: EmbeddingJobType;
  promptId?: string;
  templateId?: string;
  userId?: string;
  batchSize?: number;
}

// Add jobs to the queue
export async function addEmbeddingJob(data: EmbeddingJobData, priority = 0) {
  try {
    const job = await embeddingQueue.add(data.type, data, {
      priority,
      delay: 0,
    });
    logger.info('Embedding job added', { jobId: job.id, type: data.type });
    return job;
  } catch (error) {
    logger.error('Failed to add embedding job', { error, data });
    throw error;
  }
}

// Schedule embedding update when prompt is created/updated
export async function schedulePromptEmbeddingUpdate(promptId: string) {
  return addEmbeddingJob({
    type: EmbeddingJobType.UPDATE_PROMPT,
    promptId,
  });
}

// Schedule embedding update when template is created/updated
export async function scheduleTemplateEmbeddingUpdate(templateId: string) {
  return addEmbeddingJob({
    type: EmbeddingJobType.UPDATE_TEMPLATE,
    templateId,
  });
}

// Schedule batch update for all outdated embeddings
export async function scheduleBatchEmbeddingUpdate() {
  await addEmbeddingJob({
    type: EmbeddingJobType.BATCH_UPDATE_PROMPTS,
    batchSize: 50,
  }, -1); // Lower priority
  
  await addEmbeddingJob({
    type: EmbeddingJobType.BATCH_UPDATE_TEMPLATES,
    batchSize: 50,
  }, -1); // Lower priority
}

// Schedule update for all user prompts
export async function scheduleUserEmbeddingUpdate(userId: string) {
  return addEmbeddingJob({
    type: EmbeddingJobType.UPDATE_ALL_USER_PROMPTS,
    userId,
  });
}

// Create the worker to process jobs
export const embeddingWorker = new Worker(
  QUEUE_NAME,
  async (job: Job<EmbeddingJobData>) => {
    const { type, promptId, templateId, userId, batchSize = 50 } = job.data;
    
    logger.info('Processing embedding job', { jobId: job.id, type, attemptsMade: job.attemptsMade });
    
    try {
      switch (type) {
        case EmbeddingJobType.UPDATE_PROMPT: {
          if (!promptId) throw new Error('promptId is required');
          
          const prompt = await db.prompt.findUnique({
            where: { id: promptId },
            include: { tags: true },
          });
          
          if (!prompt) {
            logger.warn('Prompt not found for embedding update', { promptId });
            return { success: false, reason: 'Prompt not found' };
          }
          
          const text = preparePromptText(prompt);
          const embedding = await generateEmbedding(text);
          
          await db.prompt.update({
            where: { id: promptId },
            data: {
              embedding: JSON.stringify(embedding),
              embeddingVersion: 1,
              embeddingOutdated: false,
            },
          });
          
          logger.info('Prompt embedding updated', { promptId });
          return { success: true, promptId };
        }
        
        case EmbeddingJobType.UPDATE_TEMPLATE: {
          if (!templateId) throw new Error('templateId is required');
          
          const template = await db.promptTemplate.findUnique({
            where: { id: templateId },
          });
          
          if (!template) {
            logger.warn('Template not found for embedding update', { templateId });
            return { success: false, reason: 'Template not found' };
          }
          
          const text = prepareTemplateText(template);
          const embedding = await generateEmbedding(text);
          
          await db.promptTemplate.update({
            where: { id: templateId },
            data: {
              embedding: JSON.stringify(embedding),
              embeddingVersion: 1,
              embeddingOutdated: false,
            },
          });
          
          logger.info('Template embedding updated', { templateId });
          return { success: true, templateId };
        }
        
        case EmbeddingJobType.BATCH_UPDATE_PROMPTS: {
          const result = await updatePromptEmbeddings(undefined, batchSize);
          logger.info('Batch prompt embeddings updated', result);
          
          // Schedule another batch if there might be more
          if (result.updated === batchSize) {
            await scheduleBatchEmbeddingUpdate();
          }
          
          return result;
        }
        
        case EmbeddingJobType.BATCH_UPDATE_TEMPLATES: {
          const result = await updateTemplateEmbeddings(batchSize);
          logger.info('Batch template embeddings updated', result);
          
          // Schedule another batch if there might be more
          if (result.updated === batchSize) {
            await scheduleBatchEmbeddingUpdate();
          }
          
          return result;
        }
        
        case EmbeddingJobType.UPDATE_ALL_USER_PROMPTS: {
          if (!userId) throw new Error('userId is required');
          
          const result = await updatePromptEmbeddings(userId, batchSize);
          logger.info('User prompt embeddings updated', { userId, ...result });
          
          return result;
        }
        
        default:
          throw new Error(`Unknown job type: ${type}`);
      }
    } catch (error) {
      logger.error('Embedding job failed', { 
        jobId: job.id, 
        type, 
        error,
        attemptsMade: job.attemptsMade 
      });
      throw error;
    }
  },
  {
    connection: bullMQConnection,
    concurrency: 2, // Process 2 jobs at a time
    autorun: true,
  }
);

// Worker event handlers
embeddingWorker.on('completed', (job) => {
  logger.info('Embedding job completed', { 
    jobId: job.id, 
    type: job.data.type,
    returnValue: job.returnvalue 
  });
});

embeddingWorker.on('failed', (job, err) => {
  logger.error('Embedding job failed', { 
    jobId: job?.id, 
    type: job?.data.type,
    error: err.message,
    stack: err.stack,
    attemptsMade: job?.attemptsMade
  });
});

embeddingWorker.on('stalled', (jobId) => {
  logger.warn('Embedding job stalled', { jobId });
});

// Queue monitoring
export async function getQueueStats() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      embeddingQueue.getWaitingCount(),
      embeddingQueue.getActiveCount(),
      embeddingQueue.getCompletedCount(),
      embeddingQueue.getFailedCount(),
      embeddingQueue.getDelayedCount(),
    ]);
    
    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  } catch (error) {
    logger.error('Error getting queue stats', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      connected: bullMQConnection.status 
    });
    
    // Return zero stats if there's an error
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0,
    };
  }
}

// Graceful shutdown
export async function closeEmbeddingQueue() {
  await embeddingQueue.close();
  await embeddingWorker.close();
  await bullMQConnection.quit();
}

// Export connection for health checks
export { bullMQConnection };