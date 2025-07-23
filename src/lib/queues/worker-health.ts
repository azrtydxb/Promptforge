import { embeddingQueue, getQueueStats, bullMQConnection } from './embedding-queue';
import { logger } from '@/lib/logger';

export interface WorkerHealthStatus {
  isHealthy: boolean;
  queueConnected: boolean;
  hasActiveWorkers: boolean;
  stats: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    total: number;
  };
  message: string;
}

/**
 * Check the health of the embedding worker and queue
 */
export async function checkWorkerHealth(): Promise<WorkerHealthStatus> {
  try {
    // Check if queue is initialized
    if (!embeddingQueue) {
      throw new Error('Embedding queue not initialized');
    }
    
    // Get queue statistics
    const stats = await getQueueStats();
    
    // Check if queue is connected
    let queueConnected = false;
    try {
      // Use the bullMQConnection directly
      if (bullMQConnection && bullMQConnection.status === 'ready') {
        const pingResult = await bullMQConnection.ping();
        queueConnected = pingResult === 'PONG';
      } else {
        logger.warn('Redis connection not ready', { status: bullMQConnection?.status });
      }
    } catch (pingError) {
      logger.warn('Failed to ping Redis', { error: pingError instanceof Error ? pingError.message : 'Unknown' });
    }
    
    // Check for stuck jobs (jobs that have been active for too long)
    let stuckJobsCount = 0;
    try {
      const activeJobs = await embeddingQueue.getActive();
      const now = Date.now();
      stuckJobsCount = activeJobs.filter(job => {
        const startTime = job.timestamp;
        const runningTime = now - startTime;
        return runningTime > 5 * 60 * 1000; // 5 minutes
      }).length;
    } catch (activeJobsError) {
      logger.warn('Failed to check active jobs', { error: activeJobsError instanceof Error ? activeJobsError.message : 'Unknown' });
    }
    
    // Determine if workers are processing
    const hasActiveWorkers = stats.active > 0 || (stats.waiting > 0 && stuckJobsCount === 0);
    
    // Overall health check
    const isHealthy = queueConnected && (stats.failed < 10) && (stuckJobsCount === 0);
    
    let message = 'Worker health check completed';
    
    if (!queueConnected) {
      message = 'Queue is not connected to Redis';
    } else if (stats.failed > 10) {
      message = `High number of failed jobs: ${stats.failed}`;
    } else if (stuckJobsCount > 0) {
      message = `${stuckJobsCount} jobs appear to be stuck`;
    } else if (stats.waiting > 0 && !hasActiveWorkers) {
      message = 'Jobs are waiting but no workers appear to be processing. Run: npm run worker';
    } else if (isHealthy) {
      message = 'Worker and queue are healthy';
    }
    
    logger.info('Worker health check', { 
      isHealthy, 
      queueConnected, 
      hasActiveWorkers, 
      stats,
      stuckJobsCount 
    });
    
    return {
      isHealthy,
      queueConnected,
      hasActiveWorkers,
      stats,
      message
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Error checking worker health', { 
      error: errorMessage,
      stack: errorStack,
      type: error?.constructor?.name 
    });
    
    return {
      isHealthy: false,
      queueConnected: false,
      hasActiveWorkers: false,
      stats: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        total: 0
      },
      message: `Failed to check worker health: ${errorMessage}`
    };
  }
}

/**
 * Start monitoring worker health and log warnings
 */
export function startWorkerHealthMonitoring(intervalMs: number = 60000) {
  setInterval(async () => {
    const health = await checkWorkerHealth();
    
    if (!health.isHealthy) {
      logger.warn('Worker health check failed', { 
        message: health.message,
        stats: health.stats 
      });
    }
    
    // Log warning if jobs are accumulating without processing
    if (health.stats.waiting > 50 && !health.hasActiveWorkers) {
      logger.error('Embedding jobs are accumulating without processing!', {
        waiting: health.stats.waiting,
        message: 'Please ensure the worker is running: npm run worker'
      });
    }
  }, intervalMs);
}