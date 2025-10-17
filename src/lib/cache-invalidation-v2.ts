import { cacheService, cacheKeys } from '@/lib/redis';
import { sessionCache } from '@/lib/session-cache';
import { logger } from '@/lib/logger';
import {
  CacheGroup,
  invalidateCacheGroup,
  invalidateCacheGroups,
} from '@/lib/cache-versioning';

/**
 * Cache Invalidation Service V2
 *
 * Uses cache versioning instead of delPattern to avoid slow SCAN operations.
 * This provides O(1) invalidation performance vs O(N) with pattern deletion.
 *
 * Migration Path:
 * 1. All new code should use this service
 * 2. Gradually migrate existing invalidation calls
 * 3. Once migrated, remove old cache-invalidation.ts
 */
export class CacheInvalidationServiceV2 {
  /**
   * Invalidate all caches related to a user
   * Uses direct key deletion for specific user data + versioning for shared data
   */
  static async invalidateUserCaches(userId: string): Promise<void> {
    try {
      // Direct deletion of user-specific keys (fast, targeted)
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

      // Invalidate cache groups that might contain user data
      await invalidateCacheGroups(
        CacheGroup.USER_PROMPTS,
        CacheGroup.USER_PROFILE,
        CacheGroup.ANALYTICS
      );

      logger.info(`Invalidated user caches for user: ${userId}`, { userId });
    } catch (error) {
      logger.error(`Failed to invalidate user caches for ${userId}`, error, { userId });
    }
  }

  /**
   * Invalidate caches related to a specific prompt
   * Uses versioning to invalidate all prompt-related cache groups
   */
  static async invalidatePromptCaches(promptId: string, userId?: string): Promise<void> {
    try {
      // Direct deletion of specific prompt keys
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

      // Invalidate cache groups (O(1) operation!)
      await invalidateCacheGroups(
        CacheGroup.SHARED_PROMPTS,
        CacheGroup.TRENDING,
        CacheGroup.SEARCH
      );

      logger.info(`Invalidated prompt caches for prompt: ${promptId}`, { promptId, userId });
    } catch (error) {
      logger.error(`Failed to invalidate prompt caches for ${promptId}`, error, { promptId, userId });
    }
  }

  /**
   * Invalidate caches related to tags
   * Uses versioning for efficient invalidation
   */
  static async invalidateTagCaches(tagId?: string): Promise<void> {
    try {
      // Direct deletion of specific tag keys
      const tagCacheKeys = [
        cacheKeys.allTags(),
        cacheKeys.popularTags(),
      ];

      if (tagId) {
        tagCacheKeys.push(cacheKeys.tagPrompts(tagId));
      }

      await Promise.all(tagCacheKeys.map(key => cacheService.del(key)));

      // Invalidate cache groups
      await invalidateCacheGroups(
        CacheGroup.TAGS,
        CacheGroup.SHARED_PROMPTS,
        CacheGroup.SEARCH
      );

      logger.info(`Invalidated tag caches${tagId ? ` for tag: ${tagId}` : ''}`, { tagId });
    } catch (error) {
      logger.error(`Failed to invalidate tag caches`, error, { tagId });
    }
  }

  /**
   * Invalidate shared prompts marketplace caches
   * Now uses versioning instead of pattern matching!
   */
  static async invalidateSharedPromptsCaches(): Promise<void> {
    try {
      // Just increment the version - no SCAN needed!
      await invalidateCacheGroups(
        CacheGroup.SHARED_PROMPTS,
        CacheGroup.TRENDING,
        CacheGroup.SEARCH
      );

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
      // Direct deletion of known trending keys
      const trendingKeys = [
        cacheKeys.trendingPrompts(),
        cacheKeys.trendingPrompts(10),
        cacheKeys.trendingPrompts(20),
        cacheKeys.featuredPrompts(),
      ];

      await Promise.all(trendingKeys.map(key => cacheService.del(key)));

      // Invalidate trending cache group
      await invalidateCacheGroup(CacheGroup.TRENDING);

      logger.info('Invalidated trending caches');
    } catch (error) {
      logger.error('Failed to invalidate trending caches', error);
    }
  }

  /**
   * Invalidate search result caches
   * Uses versioning - much faster than pattern deletion!
   */
  static async invalidateSearchCaches(): Promise<void> {
    try {
      // Just increment the search cache version
      await invalidateCacheGroup(CacheGroup.SEARCH);

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

      // Invalidate analytics cache group
      await invalidateCacheGroup(CacheGroup.ANALYTICS);

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

      // Invalidate collections cache group
      await invalidateCacheGroup(CacheGroup.COLLECTIONS);

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

      // Invalidate folders cache group
      await invalidateCacheGroup(CacheGroup.FOLDERS);

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
   * Emergency cache clear - uses versioning for instant invalidation
   * Much faster than deleting all keys!
   */
  static async clearAllCaches(): Promise<void> {
    try {
      // Invalidate all cache groups - O(1) for each group!
      await invalidateCacheGroups(
        CacheGroup.SHARED_PROMPTS,
        CacheGroup.USER_PROMPTS,
        CacheGroup.ANALYTICS,
        CacheGroup.TAGS,
        CacheGroup.TRENDING,
        CacheGroup.SEARCH,
        CacheGroup.USER_PROFILE,
        CacheGroup.COLLECTIONS,
        CacheGroup.FOLDERS
      );

      logger.info('Emergency cache clear completed (using versioning)');
    } catch (error) {
      logger.error('Failed to clear all caches', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<{
    totalKeys: number;
    keysByPattern: Record<string, number>;
  }> {
    try {
      // Note: With versioning, we don't need to count keys by pattern
      // Old versioned keys will expire naturally via TTL
      return {
        totalKeys: 0,
        keysByPattern: {
          'Using versioning': 0,
          'Stats not needed': 0,
        }
      };
    } catch (error) {
      logger.error('Failed to get cache stats', error);
      return { totalKeys: 0, keysByPattern: {} };
    }
  }
}

// Export convenience functions
export const cacheInvalidationV2 = {
  // User operations
  user: {
    update: CacheInvalidationServiceV2.onUserUpdate,
    delete: CacheInvalidationServiceV2.onUserDelete,
    invalidateAll: CacheInvalidationServiceV2.invalidateUserCaches,
  },

  // Prompt operations
  prompt: {
    create: CacheInvalidationServiceV2.onPromptCreate,
    update: CacheInvalidationServiceV2.onPromptUpdate,
    delete: CacheInvalidationServiceV2.onPromptDelete,
    engagement: CacheInvalidationServiceV2.onPromptEngagement,
    invalidateAll: CacheInvalidationServiceV2.invalidatePromptCaches,
  },

  // Tag operations
  tag: {
    create: CacheInvalidationServiceV2.onTagCreate,
    update: CacheInvalidationServiceV2.onTagUpdate,
    delete: CacheInvalidationServiceV2.onTagDelete,
    invalidateAll: CacheInvalidationServiceV2.invalidateTagCaches,
  },

  // Collection and folder operations
  collection: {
    update: CacheInvalidationServiceV2.onCollectionUpdate,
    invalidateAll: CacheInvalidationServiceV2.invalidateCollectionCaches,
  },

  folder: {
    update: CacheInvalidationServiceV2.onFolderUpdate,
    invalidateAll: CacheInvalidationServiceV2.invalidateFolderCaches,
  },

  // Specialized invalidations
  sharedPrompts: CacheInvalidationServiceV2.invalidateSharedPromptsCaches,
  trending: CacheInvalidationServiceV2.invalidateTrendingCaches,
  search: CacheInvalidationServiceV2.invalidateSearchCaches,
  analytics: CacheInvalidationServiceV2.invalidateAnalyticsCaches,

  // Maintenance operations
  scheduleRefresh: CacheInvalidationServiceV2.scheduleAnalyticsRefresh,
  clearAll: CacheInvalidationServiceV2.clearAllCaches,
  getStats: CacheInvalidationServiceV2.getCacheStats,
};
