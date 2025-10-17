import { CacheWarmer } from '@/lib/cache-strategies';
import { PerformanceReporter } from '@/lib/performance';
import { checkDatabaseHealth } from '@/lib/db';
import { cacheService, initRedis, checkRedisHealth } from '@/lib/redis';
import { logger } from '@/lib/logger';

// Check if we're in a test environment
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

/**
 * Initialize performance optimizations
 * This should be called when the application starts
 */
export async function initializePerformanceOptimizations() {
  if (isTestEnvironment) {
    logger.info('Skipping performance initialization in test environment');
    return;
  }

  try {
    logger.info('Initializing performance optimizations...');
    
    // Check database health
    const dbHealthy = await checkDatabaseHealth();
    if (!dbHealthy) {
      logger.warn('Database health check failed');
    } else {
      logger.info('Database health check passed');
    }
    
    // Initialize and check Redis connection
    try {
      await initRedis();
      const isHealthy = await checkRedisHealth();
      if (isHealthy) {
        logger.info('Redis connection healthy');
      } else {
        logger.warn('Redis health check failed');
      }
    } catch (error) {
      logger.warn('Redis connection failed, skipping cache warming', error);
      return;
    }

    // Warm popular cache content (only after Redis is ready)
    logger.info('Starting cache warming...');
    await CacheWarmer.warmPopularContent();
    logger.info('Cache warming completed');
    
    // Schedule periodic cache warming (every hour)
    CacheWarmer.scheduleCacheWarming();
    
    // Schedule performance reporting (every 5 minutes in production)
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => {
        PerformanceReporter.logReport();
      }, 5 * 60 * 1000);
    }
    
    logger.info('Performance optimizations initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize performance optimizations', error);
  }
}

/**
 * Graceful shutdown of performance monitoring
 * This should be called when the application is shutting down
 */
export async function shutdownPerformanceMonitoring() {
  if (isTestEnvironment) return;
  
  try {
    logger.info('Shutting down performance monitoring...');
    
    // Generate final performance report
    PerformanceReporter.logReport();
    
    logger.info('Performance monitoring shut down successfully');
  } catch (error) {
    logger.error('Error during performance monitoring shutdown', error);
  }
}

// Auto-initialize if this module is imported directly
if (typeof window === 'undefined' && !isTestEnvironment) {
  // Only run in server environment and not in tests
  initializePerformanceOptimizations().catch(error => {
    logger.error('Failed to auto-initialize performance optimizations', error);
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    await shutdownPerformanceMonitoring();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    await shutdownPerformanceMonitoring();
    process.exit(0);
  });
}