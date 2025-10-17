/**
 * DEPRECATED: Redis functionality has been removed from the application.
 * This file is kept for reference but all exports are no-ops to prevent errors.
 *
 * If you need caching, consider implementing it differently or removing this dependency entirely.
 */

// import Redis from 'ioredis';
import { logger } from '@/lib/logger';

// Stub implementations to prevent import errors
export const getRedisClient = (): null => {
  logger.warn('Redis has been removed - getRedisClient() returns null');
  return null;
};

export const initRedis = async (): Promise<void> => {
  logger.info('Redis has been removed - initRedis() is a no-op');
};

export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  userPrompts: (userId: string) => `user:${userId}:prompts`,
  userTags: (userId: string) => `user:${userId}:tags`,
  userFolders: (userId: string) => `user:${userId}:folders`,
  allTags: () => 'tags:all',
  popularTags: (limit?: number) => `tags:popular${limit ? `:${limit}` : ''}`,
  tagPrompts: (tagId: string) => `tag:${tagId}:prompts`,
  prompt: (promptId: string) => `prompt:${promptId}`,
  promptVersions: (promptId: string) => `prompt:${promptId}:versions`,
  promptLikes: (promptId: string) => `prompt:${promptId}:likes`,
  promptComments: (promptId: string) => `prompt:${promptId}:comments`,
  sharedPrompts: (page: number, limit: number, filters?: string) =>
    `shared-prompts:${page}:${limit}:${filters || 'none'}`,
  trendingPrompts: (limit?: number) => `trending:prompts${limit ? `:${limit}` : ''}`,
  featuredPrompts: () => 'featured:prompts',
  dashboardAnalytics: (userId: string) => `analytics:${userId}`,
  globalAnalytics: () => 'analytics:global',
  userStats: (userId: string) => `stats:${userId}`,
  searchResults: (query: string, page: number, filters?: string) =>
    `search:${Buffer.from(query).toString('base64')}:${page}:${filters || 'none'}`,
  session: (sessionId: string) => `session:${sessionId}`,
  userSession: (userId: string) => `user:${userId}:session`,
  rateLimit: (identifier: string, window: string) => `rate:${identifier}:${window}`,
  collection: (collectionId: string) => `collection:${collectionId}`,
  folder: (folderId: string) => `folder:${folderId}`,
  folderContents: (folderId: string) => `folder:${folderId}:contents`,
};

export const cacheTTL = {
  searchResults: 60 * 5,
  promptComments: 60 * 10,
  sharedPrompts: 60 * 10,
  dashboardAnalytics: 60 * 15,
  trendingPrompts: 60 * 20,
  promptDetails: 60 * 20,
  userStats: 60 * 30,
  tags: 60 * 30,
  userProfile: 60 * 60,
  globalAnalytics: 60 * 60 * 2,
  featuredPrompts: 60 * 60 * 6,
  session: 60 * 60 * 24,
  userSession: 60 * 60 * 12,
  rateLimitWindow: 60 * 15,
};

// Stub CacheService class
export class CacheService {
  public redis: null = null;

  constructor() {
    logger.warn('CacheService instantiated but Redis has been removed - all operations are no-ops');
  }

  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async getBuffer(_key: string): Promise<Buffer | null> {
    return null;
  }

  async set(_key: string, _value: unknown, _ttl?: number): Promise<boolean> {
    return false;
  }

  async setBuffer(_key: string, _value: Buffer, _ttl?: number): Promise<boolean> {
    return false;
  }

  async del(_key: string): Promise<boolean> {
    return false;
  }

  async delPattern(_pattern: string): Promise<boolean> {
    return false;
  }

  async exists(_key: string): Promise<boolean> {
    return false;
  }

  async ttl(_key: string): Promise<number> {
    return -1;
  }

  async incr(_key: string, _ttl?: number): Promise<number> {
    return 0;
  }

  async expire(_key: string, _ttl: number): Promise<boolean> {
    return false;
  }

  pipeline() {
    return {
      get: () => this,
      setex: () => this,
      exec: async () => [],
    };
  }

  multi() {
    return {
      exec: async () => [],
    };
  }
}

export const cacheService = new CacheService();

// Stub helper function
export async function cacheAside<T>(
  _key: string,
  fetchFunction: () => Promise<T>,
  _ttl?: number,
  _options: {
    skipCache?: boolean;
    refreshCache?: boolean;
  } = {}
): Promise<T> {
  // Without Redis, always fetch from source
  return await fetchFunction();
}

// Stub cache invalidation functions
export async function invalidateUserCaches(_userId: string): Promise<void> {
  logger.debug('invalidateUserCaches is a no-op - Redis has been removed');
}

export async function invalidateTagCaches(): Promise<void> {
  logger.debug('invalidateTagCaches is a no-op - Redis has been removed');
}

export async function invalidatePromptCaches(_promptId: string): Promise<void> {
  logger.debug('invalidatePromptCaches is a no-op - Redis has been removed');
}

export async function invalidateAnalyticsCaches(): Promise<void> {
  logger.debug('invalidateAnalyticsCaches is a no-op - Redis has been removed');
}

// Stub rate limiting
export async function checkRateLimit(
  _identifier: string,
  limit: number,
  windowSeconds: number = 900
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  // Without Redis, always allow (fail open)
  return {
    allowed: true,
    remaining: limit,
    resetTime: Date.now() + (windowSeconds * 1000),
  };
}

// Stub health check
export async function checkRedisHealth(): Promise<boolean> {
  return false;
}

// Stub shutdown
export async function closeRedis(): Promise<void> {
  logger.debug('closeRedis is a no-op - Redis has been removed');
}
