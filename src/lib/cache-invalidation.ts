import { cacheService, cacheKeys } from '@/lib/redis';
import { sessionCache } from '@/lib/session-cache';
import { logger } from '@/lib/logger';

/**
 * Cache Invalidation Service
 * Provides automatic cache invalidation strategies for data mutations
 */
export class CacheInvalidationService {
  /**
   * Invalidate all caches related to a user
   */
  static async invalidateUserCaches(userId: string): Promise<void> {
    try {
      const userCacheKeys = [
        cacheKeys.user(userId),
        cacheKeys.userProfile(userId),
        cacheKeys.userPrompts(userId),
        cacheKeys.userTags(userId),
        cacheKeys.userFolders(userId),
        cacheKeys.dashboardAnalytics(userId),
        cacheKeys.userStats(userId),
        cacheKeys.userSession(userId),
        cacheKeys.session(userId),
      ];

      await Promise.all(userCacheKeys.map(key => cacheService.del(key)));
      
      // Also invalidate session cache
      await sessionCache.invalidateUser(userId);
      
      logger.info(`Invalidated user caches for user: ${userId}`, { userId });
    } catch (error) {
      logger.error(`Failed to invalidate user caches for ${userId}`, error, { userId });
    }
  }

  /**
   * Invalidate caches related to a specific prompt
   */
  static async invalidatePromptCaches(promptId: string, userId?: string): Promise<void> {
    try {
      const promptCacheKeys = [
        cacheKeys.prompt(promptId),
        cacheKeys.promptVersions(promptId),
        cacheKeys.promptLikes(promptId),
        cacheKeys.promptComments(promptId),
      ];

      await Promise.all(promptCacheKeys.map(key => cacheService.del(key)));

      // Invalidate user-specific caches if userId provided
      if (userId) {
        const userCacheKeys = [
          cacheKeys.userPrompts(userId),
          cacheKeys.dashboardAnalytics(userId),
          cacheKeys.userStats(userId),
        ];
        await Promise.all(userCacheKeys.map(key => cacheService.del(key)));
      }

      // Invalidate shared prompts and trending caches
      await this.invalidateSharedPromptsCaches();
      await this.invalidateTrendingCaches();

      logger.info(`Invalidated prompt caches for prompt: ${promptId}`, { promptId, userId });
    } catch (error) {
      logger.error(`Failed to invalidate prompt caches for ${promptId}`, error, { promptId, userId });
    }
  }

  /**
   * Invalidate caches related to tags
   */
  static async invalidateTagCaches(tagId?: string): Promise<void> {
    try {
      const tagCacheKeys = [
        cacheKeys.allTags(),
        cacheKeys.popularTags(),
      ];

      if (tagId) {
        tagCacheKeys.push(cacheKeys.tagPrompts(tagId));
      }

      await Promise.all(tagCacheKeys.map(key => cacheService.del(key)));

      // Invalidate related caches
      await this.invalidateSharedPromptsCaches();
      await this.invalidateSearchCaches();

      logger.info(`Invalidated tag caches${tagId ? ` for tag: ${tagId}` : ''}`, { tagId });
    } catch (error) {
      logger.error(`Failed to invalidate tag caches`, error, { tagId });
    }
  }

  /**
   * Invalidate shared prompts marketplace caches
   */
  static async invalidateSharedPromptsCaches(): Promise<void> {
    try {
      // Use pattern matching to clear all shared prompts caches
      await cacheService.delPattern('shared-prompts:*');
      await cacheService.delPattern('trending:*');
      await cacheService.delPattern('featured:*');

      logger.info('Invalidated shared prompts caches');
    } catch (error) {
      logger.error('Failed to invalidate shared prompts caches', error);
    }
  }

  /**
   * Invalidate trending and featured content caches
   */
  static async invalidateTrendingCaches(): Promise<void> {
    try {
      const trendingKeys = [
        cacheKeys.trendingPrompts(),
        cacheKeys.trendingPrompts(10),
        cacheKeys.trendingPrompts(20),
        cacheKeys.featuredPrompts(),
      ];

      await Promise.all(trendingKeys.map(key => cacheService.del(key)));

      logger.info('Invalidated trending caches');
    } catch (error) {
      logger.error('Failed to invalidate trending caches', error);
    }
  }

  /**
   * Invalidate search result caches
   */
  static async invalidateSearchCaches(): Promise<void> {
    try {
      // Clear all search result caches
      await cacheService.delPattern('search:*');

      logger.info('Invalidated search caches');
    } catch (error) {
      logger.error('Failed to invalidate search caches', error);
    }
  }

  /**
   * Invalidate analytics caches
   */
  static async invalidateAnalyticsCaches(userId?: string): Promise<void> {
    try {
      const analyticsCacheKeys = [
        cacheKeys.globalAnalytics(),
      ];

      if (userId) {
        analyticsCacheKeys.push(
          cacheKeys.dashboardAnalytics(userId),
          cacheKeys.userStats(userId)
        );
      }

      await Promise.all(analyticsCacheKeys.map(key => cacheService.del(key)));

      logger.info(`Invalidated analytics caches${userId ? ` for user: ${userId}` : ''}`, { userId });
    } catch (error) {
      logger.error('Failed to invalidate analytics caches', error, { userId });
    }
  }

  /**
   * Invalidate collection and folder caches
   */
  static async invalidateCollectionCaches(collectionId?: string, userId?: string): Promise<void> {
    try {
      const collectionCacheKeys: string[] = [];

      if (collectionId) {
        collectionCacheKeys.push(cacheKeys.collection(collectionId));
      }

      if (userId) {
        collectionCacheKeys.push(cacheKeys.userFolders(userId));
      }

      await Promise.all(collectionCacheKeys.map(key => cacheService.del(key)));

      logger.info(`Invalidated collection caches${collectionId ? ` for collection: ${collectionId}` : ''}`, { collectionId, userId });
    } catch (error) {
      logger.error('Failed to invalidate collection caches', error, { collectionId, userId });
    }
  }

  /**
   * Invalidate folder caches
   */
  static async invalidateFolderCaches(folderId?: string, userId?: string): Promise<void> {
    try {
      const folderCacheKeys: string[] = [];

      if (folderId) {
        folderCacheKeys.push(
          cacheKeys.folder(folderId),
          cacheKeys.folderContents(folderId)
        );
      }

      if (userId) {
        folderCacheKeys.push(cacheKeys.userFolders(userId));
      }

      await Promise.all(folderCacheKeys.map(key => cacheService.del(key)));

      logger.info(`Invalidated folder caches${folderId ? ` for folder: ${folderId}` : ''}`, { folderId, userId });
    } catch (error) {
      logger.error('Failed to invalidate folder caches', error, { folderId, userId });
    }
  }

  /**
   * Comprehensive cache invalidation for prompt operations
   */
  static async onPromptCreate(promptId: string, userId: string, tagIds?: string[]): Promise<void> {
    await Promise.all([
      this.invalidatePromptCaches(promptId, userId),
      this.invalidateUserCaches(userId),
      this.invalidateAnalyticsCaches(userId),
      tagIds && tagIds.length > 0 ? this.invalidateTagCaches() : Promise.resolve(),
    ]);
  }

  static async onPromptUpdate(promptId: string, userId: string, tagIds?: string[]): Promise<void> {
    await Promise.all([
      this.invalidatePromptCaches(promptId, userId),
      this.invalidateUserCaches(userId),
      tagIds && tagIds.length > 0 ? this.invalidateTagCaches() : Promise.resolve(),
    ]);
  }

  static async onPromptDelete(promptId: string, userId: string): Promise<void> {
    await Promise.all([
      this.invalidatePromptCaches(promptId, userId),
      this.invalidateUserCaches(userId),
      this.invalidateAnalyticsCaches(userId),
      this.invalidateSharedPromptsCaches(),
    ]);
  }

  /**
   * Cache invalidation for tag operations
   */
  static async onTagCreate(tagId: string): Promise<void> {
    await this.invalidateTagCaches(tagId);
  }

  static async onTagUpdate(tagId: string): Promise<void> {
    await Promise.all([
      this.invalidateTagCaches(tagId),
      this.invalidateSharedPromptsCaches(),
      this.invalidateSearchCaches(),
    ]);
  }

  static async onTagDelete(tagId: string): Promise<void> {
    await Promise.all([
      this.invalidateTagCaches(tagId),
      this.invalidateSharedPromptsCaches(),
      this.invalidateSearchCaches(),
    ]);
  }

  /**
   * Cache invalidation for user operations
   */
  static async onUserUpdate(userId: string): Promise<void> {
    await this.invalidateUserCaches(userId);
  }

  static async onUserDelete(userId: string): Promise<void> {
    await Promise.all([
      this.invalidateUserCaches(userId),
      this.invalidateAnalyticsCaches(),
      this.invalidateSharedPromptsCaches(),
    ]);
  }

  /**
   * Cache invalidation for engagement operations (likes, comments, shares)
   */
  static async onPromptEngagement(promptId: string, userId?: string): Promise<void> {
    await Promise.all([
      this.invalidatePromptCaches(promptId, userId),
      this.invalidateTrendingCaches(),
      userId ? this.invalidateAnalyticsCaches(userId) : Promise.resolve(),
    ]);
  }

  /**
   * Cache invalidation for collection/folder operations
   */
  static async onCollectionUpdate(collectionId: string, userId: string): Promise<void> {
    await Promise.all([
      this.invalidateCollectionCaches(collectionId, userId),
      this.invalidateUserCaches(userId),
    ]);
  }

  static async onFolderUpdate(folderId: string, userId: string): Promise<void> {
    await Promise.all([
      this.invalidateFolderCaches(folderId, userId),
      this.invalidateUserCaches(userId),
    ]);
  }

  /**
   * Scheduled cache invalidation for analytics and trending data
   */
  static async scheduleAnalyticsRefresh(): Promise<void> {
    try {
      // Invalidate analytics caches to force refresh
      await this.invalidateAnalyticsCaches();
      await this.invalidateTrendingCaches();

      logger.info('Scheduled analytics cache refresh completed');
    } catch (error) {
      logger.error('Failed to refresh analytics caches', error);
    }
  }

  /**
   * Emergency cache clear - use with caution
   */
  static async clearAllCaches(): Promise<void> {
    try {
      // Clear all application caches
      await Promise.all([
        cacheService.delPattern('prompt:*'),
        cacheService.delPattern('user:*'),
        cacheService.delPattern('tag:*'),
        cacheService.delPattern('shared-prompts:*'),
        cacheService.delPattern('trending:*'),
        cacheService.delPattern('featured:*'),
        cacheService.delPattern('search:*'),
        cacheService.delPattern('analytics:*'),
        cacheService.delPattern('stats:*'),
        cacheService.delPattern('session:*'),
        cacheService.delPattern('collection:*'),
        cacheService.delPattern('folder:*'),
        cacheService.delPattern('rate:*'),
      ]);

      logger.info('Emergency cache clear completed');
    } catch (error) {
      logger.error('Failed to clear all caches', error);
    }
  }

  /**
   * Get cache invalidation statistics
   */
  static async getCacheStats(): Promise<{
    totalKeys: number;
    keysByPattern: Record<string, number>;
  }> {
    try {
      const patterns = [
        'prompt:*',
        'user:*',
        'tag:*',
        'shared-prompts:*',
        'trending:*',
        'search:*',
        'analytics:*',
        'session:*',
      ];

      const keysByPattern: Record<string, number> = {};
      const totalKeys = 0;

      for (const pattern of patterns) {
        // This would need to be implemented based on Redis SCAN command
        // For now, return placeholder data
        keysByPattern[pattern] = 0;
      }

      return { totalKeys, keysByPattern };
    } catch (error) {
      logger.error('Failed to get cache stats', error);
      return { totalKeys: 0, keysByPattern: {} };
    }
  }
}

// Export convenience functions
export const cacheInvalidation = {
  // User operations
  user: {
    update: CacheInvalidationService.onUserUpdate,
    delete: CacheInvalidationService.onUserDelete,
    invalidateAll: CacheInvalidationService.invalidateUserCaches,
  },

  // Prompt operations
  prompt: {
    create: CacheInvalidationService.onPromptCreate,
    update: CacheInvalidationService.onPromptUpdate,
    delete: CacheInvalidationService.onPromptDelete,
    engagement: CacheInvalidationService.onPromptEngagement,
    invalidateAll: CacheInvalidationService.invalidatePromptCaches,
  },

  // Tag operations
  tag: {
    create: CacheInvalidationService.onTagCreate,
    update: CacheInvalidationService.onTagUpdate,
    delete: CacheInvalidationService.onTagDelete,
    invalidateAll: CacheInvalidationService.invalidateTagCaches,
  },

  // Collection and folder operations
  collection: {
    update: CacheInvalidationService.onCollectionUpdate,
    invalidateAll: CacheInvalidationService.invalidateCollectionCaches,
  },

  folder: {
    update: CacheInvalidationService.onFolderUpdate,
    invalidateAll: CacheInvalidationService.invalidateFolderCaches,
  },

  // Specialized invalidations
  sharedPrompts: CacheInvalidationService.invalidateSharedPromptsCaches,
  trending: CacheInvalidationService.invalidateTrendingCaches,
  search: CacheInvalidationService.invalidateSearchCaches,
  analytics: CacheInvalidationService.invalidateAnalyticsCaches,

  // Maintenance operations
  scheduleRefresh: CacheInvalidationService.scheduleAnalyticsRefresh,
  clearAll: CacheInvalidationService.clearAllCaches,
  getStats: CacheInvalidationService.getCacheStats,
};