import Redis from 'ioredis';
import { logger } from '@/lib/logger';

// Check if Redis is enabled via environment variable
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

// Redis client configuration with best practices from ioredis docs
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'redispassword', // Use default from docker-compose
  db: 0,

  // Connection settings
  lazyConnect: false, // Connect immediately on initialization (FIX B: connection pooling)
  keepAlive: 30000,
  family: 4, // IPv4
  connectTimeout: 10000,
  commandTimeout: 5000, // 5 seconds for faster failures

  // Retry and reconnection settings
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },

  // Reconnection on specific errors
  reconnectOnError(err: Error) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },

  // Enable autopipelining for better performance
  enableAutoPipelining: true,

  // Enable offline queue to buffer commands when connection is lost (FIX B: connection pooling)
  enableOfflineQueue: true,
};

// Create Redis client instance
let redis: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redis) {
    redis = new Redis(redisConfig);

    redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redis.on('ready', () => {
      logger.info('Redis client ready');
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error', err);
    });

    redis.on('reconnecting', () => {
      logger.info('Redis reconnecting');
    });

    redis.on('close', () => {
      logger.info('Redis connection closed');
    });
  }

  return redis;
};

// Initialize connection
export const initRedis = async (): Promise<void> => {
  if (!REDIS_ENABLED) {
    logger.info('Redis is disabled via REDIS_ENABLED environment variable');
    return;
  }

  const client = getRedisClient();
  try {
    await client.connect();
    logger.info('Redis initialization complete');
  } catch (error) {
    logger.error('Failed to initialize Redis', error);
    throw error;
  }
};

// Cache key generators with proper namespacing
export const cacheKeys = {
  // User-related keys
  user: (userId: string) => `user:${userId}`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  userPrompts: (userId: string) => `user:${userId}:prompts`,
  userTags: (userId: string) => `user:${userId}:tags`,
  userFolders: (userId: string) => `user:${userId}:folders`,

  // Tag-related keys
  allTags: () => 'tags:all',
  popularTags: (limit?: number) => `tags:popular${limit ? `:${limit}` : ''}`,
  tagPrompts: (tagId: string) => `tag:${tagId}:prompts`,

  // Prompt-related keys
  prompt: (promptId: string) => `prompt:${promptId}`,
  promptVersions: (promptId: string) => `prompt:${promptId}:versions`,
  promptLikes: (promptId: string) => `prompt:${promptId}:likes`,
  promptComments: (promptId: string) => `prompt:${promptId}:comments`,

  // Shared prompts and marketplace
  sharedPrompts: (page: number, limit: number, filters?: string) =>
    `shared-prompts:${page}:${limit}:${filters || 'none'}`,
  trendingPrompts: (limit?: number) => `trending:prompts${limit ? `:${limit}` : ''}`,
  featuredPrompts: () => 'featured:prompts',

  // Analytics and dashboard
  dashboardAnalytics: (userId: string) => `analytics:${userId}`,
  globalAnalytics: () => 'analytics:global',
  userStats: (userId: string) => `stats:${userId}`,

  // Search and filtering
  searchResults: (query: string, page: number, filters?: string) =>
    `search:${Buffer.from(query).toString('base64')}:${page}:${filters || 'none'}`,

  // Session and auth
  session: (sessionId: string) => `session:${sessionId}`,
  userSession: (userId: string) => `user:${userId}:session`,

  // Rate limiting
  rateLimit: (identifier: string, window: string) => `rate:${identifier}:${window}`,

  // Collections and folders
  collection: (collectionId: string) => `collection:${collectionId}`,
  folder: (folderId: string) => `folder:${folderId}`,
  folderContents: (folderId: string) => `folder:${folderId}:contents`,
};

// Cache TTL constants (in seconds)
export const cacheTTL = {
  // Short-term cache (5-15 minutes)
  searchResults: 60 * 5, // 5 minutes
  promptComments: 60 * 10, // 10 minutes
  sharedPrompts: 60 * 10, // 10 minutes

  // Medium-term cache (15-60 minutes)
  dashboardAnalytics: 60 * 15, // 15 minutes
  trendingPrompts: 60 * 20, // 20 minutes
  promptDetails: 60 * 20, // 20 minutes
  userStats: 60 * 30, // 30 minutes
  tags: 60 * 30, // 30 minutes

  // Long-term cache (1-24 hours)
  userProfile: 60 * 60, // 1 hour
  globalAnalytics: 60 * 60 * 2, // 2 hours
  featuredPrompts: 60 * 60 * 6, // 6 hours

  // Session cache
  session: 60 * 60 * 24, // 24 hours
  userSession: 60 * 60 * 12, // 12 hours

  // Rate limiting
  rateLimitWindow: 60 * 15, // 15 minutes
};

// Cache utility class with error handling and logging
export class CacheService {
  public redis: Redis;

  constructor() {
    this.redis = getRedisClient();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (value === null) return null;

      try {
        return JSON.parse(value);
      } catch (parseError) {
        logger.warn(`Failed to parse cached value for key ${key}`, { key, error: parseError });
        return null;
      }
    } catch (error) {
      logger.error(`Cache get error for key ${key}`, error, { key });
      return null;
    }
  }

  async getBuffer(key: string): Promise<Buffer | null> {
    try {
      return await this.redis.getBuffer(key);
    } catch (error) {
      logger.error(`Cache getBuffer error for key ${key}`, error, { key });
      return null;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}`, error, { key });
      return false;
    }
  }

  async setBuffer(key: string, value: Buffer, ttl?: number): Promise<boolean> {
    try {
      if (ttl) {
        await this.redis.setex(key, ttl, value);
      } else {
        await this.redis.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Cache setBuffer error for key ${key}`, error, { key });
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}`, error, { key });
      return false;
    }
  }

  async delPattern(pattern: string): Promise<boolean> {
    try {
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100,
      });

      const keys: string[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (resultKeys: string[]) => {
          keys.push(...resultKeys);
        });

        stream.on('end', async () => {
          try {
            if (keys.length > 0) {
              // Use pipeline for better performance when deleting multiple keys
              const pipeline = this.redis.pipeline();
              keys.forEach(key => pipeline.del(key));
              await pipeline.exec();
            }
            resolve(true);
          } catch (error) {
            reject(error);
          }
        });

        stream.on('error', reject);
      });
    } catch (error) {
      logger.error(`Cache delete pattern error for pattern ${pattern}`, error, { pattern });
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}`, error, { key });
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL error for key ${key}`, error, { key });
      return -1;
    }
  }

  async incr(key: string, ttl?: number): Promise<number> {
    try {
      const result = await this.redis.incr(key);
      if (ttl && result === 1) {
        // Set TTL only on first increment
        await this.redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      logger.error(`Cache incr error for key ${key}`, error, { key });
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}`, error, { key });
      return false;
    }
  }

  // Pipeline operations for batch processing
  pipeline() {
    return this.redis.pipeline();
  }

  // Multi/transaction operations
  multi() {
    return this.redis.multi();
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Export Redis enabled flag for other modules
export const isRedisEnabled = () => REDIS_ENABLED;

// Helper function for cache-aside pattern with error handling
export async function cacheAside<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  ttl?: number,
  options: {
    skipCache?: boolean;
    refreshCache?: boolean;
  } = {}
): Promise<T> {
  const { skipCache = false, refreshCache = false } = options;

  // FIX A: Check if Redis is enabled via environment variable
  if (!REDIS_ENABLED) {
    return await fetchFunction();
  }

  // Skip cache if requested
  if (skipCache) {
    return await fetchFunction();
  }

  // Try to get from cache first (unless refreshing)
  if (!refreshCache) {
    const cached = await cacheService.get<T>(key);
    if (cached !== null) {
      return cached;
    }
  }

  // If not in cache or refreshing, fetch from source
  const data = await fetchFunction();

  // Store in cache for next time (fire and forget)
  cacheService.set(key, data, ttl).catch(error => {
    logger.warn(`Failed to cache data for key ${key}`, { key, error });
  });

  return data;
}

// Helper functions for cache invalidation patterns
export async function invalidateUserCaches(userId: string): Promise<void> {
  if (!REDIS_ENABLED) return;

  const patterns = [
    cacheKeys.user(userId),
    cacheKeys.userProfile(userId),
    cacheKeys.userPrompts(userId),
    cacheKeys.userTags(userId),
    cacheKeys.userFolders(userId),
    cacheKeys.dashboardAnalytics(userId),
    cacheKeys.userStats(userId),
    cacheKeys.userSession(userId),
  ];

  await Promise.all(patterns.map(pattern => cacheService.del(pattern)));

  // Also invalidate shared prompts cache as user data might affect it
  await cacheService.delPattern('shared-prompts:*');
}

export async function invalidateTagCaches(): Promise<void> {
  if (!REDIS_ENABLED) return;

  await Promise.all([
    cacheService.del(cacheKeys.allTags()),
    cacheService.delPattern('tags:popular*'),
    cacheService.delPattern('user:*:tags'),
    cacheService.delPattern('tag:*:prompts'),
  ]);
}

export async function invalidatePromptCaches(promptId: string): Promise<void> {
  if (!REDIS_ENABLED) return;

  await Promise.all([
    cacheService.del(cacheKeys.prompt(promptId)),
    cacheService.del(cacheKeys.promptVersions(promptId)),
    cacheService.del(cacheKeys.promptLikes(promptId)),
    cacheService.del(cacheKeys.promptComments(promptId)),
    cacheService.delPattern('shared-prompts:*'),
    cacheService.delPattern('search:*'),
    cacheService.delPattern('trending:*'),
  ]);
}

export async function invalidateAnalyticsCaches(): Promise<void> {
  if (!REDIS_ENABLED) return;

  await Promise.all([
    cacheService.delPattern('analytics:*'),
    cacheService.delPattern('stats:*'),
    cacheService.delPattern('trending:*'),
  ]);
}

// Rate limiting helper
export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number = 900 // 15 minutes default
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  // If Redis is disabled, fail open (allow all requests)
  if (!REDIS_ENABLED) {
    return {
      allowed: true,
      remaining: limit,
      resetTime: Date.now() + (windowSeconds * 1000),
    };
  }

  const key = cacheKeys.rateLimit(identifier, windowSeconds.toString());

  try {
    const current = await cacheService.incr(key, windowSeconds);
    const ttl = await cacheService.ttl(key);

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
      resetTime: Date.now() + (ttl * 1000),
    };
  } catch (error) {
    logger.error('Rate limit check error', error, { key, limit, windowSeconds });
    // Fail open - allow the request if Redis is down
    return {
      allowed: true,
      remaining: limit,
      resetTime: Date.now() + (windowSeconds * 1000),
    };
  }
}

// Health check function
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await cacheService.redis.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed', error);
    return false;
  }
}

// Graceful shutdown
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
