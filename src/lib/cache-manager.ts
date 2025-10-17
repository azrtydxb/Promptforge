/**
 * Unified Cache Manager
 *
 * Central service for managing Redis caching across the application.
 * Provides coordinated cache invalidation and warming strategies.
 */

import { logger } from '@/lib/logger';
import { invalidatePromptCachesRedis, warmPromptCachesRedis } from '@/app/actions/prompt.actions.redis';
import { invalidateFolderCachesRedis, warmFolderCachesRedis } from '@/app/actions/folder.actions.redis';
import { invalidateTagCachesRedis, warmTagCachesRedis } from '@/app/actions/tag.actions.redis';
import { invalidateSharedPromptsCaches, warmSharedPromptsCaches } from '@/app/actions/shared-prompts.actions.cached';

/**
 * Cache Manager Class
 *
 * Coordinates caching operations across different data domains
 */
export class CacheManager {
  /**
   * Invalidate all caches related to a prompt operation
   * @param userId - User ID who owns the prompt
   * @param promptId - Optional specific prompt ID
   * @param options - Additional invalidation options
   */
  static async onPromptMutation(
    userId: string,
    promptId?: string,
    options: {
      invalidateTags?: boolean;
      invalidateFolders?: boolean;
      invalidateShared?: boolean;
    } = {}
  ): Promise<void> {
    const {
      invalidateTags = false,
      invalidateFolders = false,
      invalidateShared = false,
    } = options;

    try {
      const invalidations = [
        invalidatePromptCachesRedis(userId, promptId),
      ];

      if (invalidateTags) {
        invalidations.push(invalidateTagCachesRedis(userId));
      }

      if (invalidateFolders) {
        invalidations.push(invalidateFolderCachesRedis(userId));
      }

      if (invalidateShared) {
        invalidations.push(invalidateSharedPromptsCaches());
      }

      await Promise.all(invalidations);

      logger.info('Prompt caches invalidated', {
        userId,
        promptId,
        invalidateTags,
        invalidateFolders,
        invalidateShared,
      });
    } catch (error) {
      logger.error('Failed to invalidate prompt caches', error, { userId, promptId });
    }
  }

  /**
   * Invalidate all caches related to a folder operation
   * @param userId - User ID who owns the folder
   * @param folderId - Optional specific folder ID
   */
  static async onFolderMutation(userId: string, folderId?: string): Promise<void> {
    try {
      await Promise.all([
        invalidateFolderCachesRedis(userId),
        invalidatePromptCachesRedis(userId), // Folder changes affect prompt lists
      ]);

      logger.info('Folder caches invalidated', { userId, folderId });
    } catch (error) {
      logger.error('Failed to invalidate folder caches', error, { userId, folderId });
    }
  }

  /**
   * Invalidate all caches related to a tag operation
   * @param userId - Optional user ID if user-specific
   */
  static async onTagMutation(userId?: string): Promise<void> {
    try {
      await Promise.all([
        invalidateTagCachesRedis(userId),
        invalidatePromptCachesRedis(userId || ''), // Tags affect prompt display
        invalidateSharedPromptsCaches(), // Tags affect shared prompts
      ]);

      logger.info('Tag caches invalidated', { userId });
    } catch (error) {
      logger.error('Failed to invalidate tag caches', error, { userId });
    }
  }

  /**
   * Invalidate all caches related to a user
   * @param userId - User ID
   */
  static async onUserMutation(userId: string): Promise<void> {
    try {
      await Promise.all([
        invalidatePromptCachesRedis(userId),
        invalidateFolderCachesRedis(userId),
        invalidateTagCachesRedis(userId),
      ]);

      logger.info('All user caches invalidated', { userId });
    } catch (error) {
      logger.error('Failed to invalidate user caches', error, { userId });
    }
  }

  /**
   * Warm up all caches for a user
   * Call this after login or on-demand
   * @param userId - User ID
   */
  static async warmUserCaches(userId: string): Promise<void> {
    try {
      logger.info('Starting user cache warming', { userId });

      await Promise.all([
        warmPromptCachesRedis(userId),
        warmFolderCachesRedis(userId),
      ]);

      logger.info('User cache warming completed', { userId });
    } catch (error) {
      logger.error('Failed to warm user caches', error, { userId });
    }
  }

  /**
   * Warm up global caches
   * Call this on application startup or scheduled intervals
   */
  static async warmGlobalCaches(): Promise<void> {
    try {
      logger.info('Starting global cache warming');

      await Promise.all([
        warmTagCachesRedis(),
        warmSharedPromptsCaches(),
      ]);

      logger.info('Global cache warming completed');
    } catch (error) {
      logger.error('Failed to warm global caches', error);
    }
  }

  /**
   * Scheduled cache refresh
   * Run this periodically (e.g., every hour) to refresh stale caches
   */
  static async scheduledRefresh(): Promise<void> {
    try {
      logger.info('Starting scheduled cache refresh');

      // Refresh global caches only (user caches refresh on-demand)
      await Promise.all([
        warmTagCachesRedis(),
        warmSharedPromptsCaches(),
      ]);

      logger.info('Scheduled cache refresh completed');
    } catch (error) {
      logger.error('Failed to refresh caches', error);
    }
  }
}

/**
 * Convenience functions for common cache operations
 */

// Prompt operations
export const onPromptCreate = (userId: string, options = {}) =>
  CacheManager.onPromptMutation(userId, undefined, { ...options, invalidateShared: false });

export const onPromptUpdate = (userId: string, promptId: string, options = {}) =>
  CacheManager.onPromptMutation(userId, promptId, options);

export const onPromptDelete = (userId: string, promptId: string) =>
  CacheManager.onPromptMutation(userId, promptId, {
    invalidateFolders: true,
    invalidateShared: true,
  });

export const onPromptMove = (userId: string, promptId: string) =>
  CacheManager.onPromptMutation(userId, promptId, { invalidateFolders: true });

export const onPromptLike = (userId: string, promptId: string) =>
  CacheManager.onPromptMutation(userId, promptId);

export const onPromptPin = (userId: string, promptId: string) =>
  CacheManager.onPromptMutation(userId, promptId);

// Folder operations
export const onFolderCreate = (userId: string) =>
  CacheManager.onFolderMutation(userId);

export const onFolderUpdate = (userId: string, folderId: string) =>
  CacheManager.onFolderMutation(userId, folderId);

export const onFolderDelete = (userId: string, folderId: string) =>
  CacheManager.onFolderMutation(userId, folderId);

export const onFolderMove = (userId: string, folderId: string) =>
  CacheManager.onFolderMutation(userId, folderId);

// Tag operations
export const onTagCreate = () =>
  CacheManager.onTagMutation();

export const onTagUpdate = () =>
  CacheManager.onTagMutation();

export const onTagDelete = () =>
  CacheManager.onTagMutation();

export const onPromptTagsUpdate = (userId: string, promptId: string) =>
  CacheManager.onPromptMutation(userId, promptId, {
    invalidateTags: true,
    invalidateShared: true,
  });

// User operations
export const onUserLogin = (userId: string) =>
  CacheManager.warmUserCaches(userId);

export const onUserUpdate = (userId: string) =>
  CacheManager.onUserMutation(userId);

// Shared prompt operations
export const onSharedPromptPublish = async () => {
  await invalidateSharedPromptsCaches();
};

export const onSharedPromptUpdate = async () => {
  await invalidateSharedPromptsCaches();
};

export const onSharedPromptDelete = async () => {
  await invalidateSharedPromptsCaches();
};

/**
 * Initialize cache warming on application startup
 */
export async function initializeCaching(): Promise<void> {
  try {
    logger.info('Initializing application caching');
    await CacheManager.warmGlobalCaches();
    logger.info('Application caching initialized');
  } catch (error) {
    logger.error('Failed to initialize caching', error);
  }
}

/**
 * Schedule periodic cache refresh
 * Call this once on application startup
 */
export function scheduleCacheRefresh(intervalMinutes: number = 60): void {
  setInterval(async () => {
    await CacheManager.scheduledRefresh();
  }, intervalMinutes * 60 * 1000);

  logger.info(`Scheduled cache refresh every ${intervalMinutes} minutes`);
}
