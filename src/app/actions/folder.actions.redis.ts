"use server";

import { requireAuth } from "@/lib/auth";
import { cacheAside, cacheKeys, cacheService } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { getFolders as getFoldersDB } from './folder.actions';

/**
 * Redis-Cached Folder Actions
 *
 * These functions wrap existing folder actions with Redis caching
 * to improve cache hit rates.
 */

// Cache TTL configuration (in seconds)
const FOLDER_CACHE_TTL = {
  userFolders: 60 * 10,  // 10 minutes - folder structure changes infrequently
};

/**
 * Get all folders for the current user (Redis-cached)
 * Cache key: user:{userId}:folders
 */
export async function getFoldersRedis() {
  const user = await requireAuth();
  const cacheKey = cacheKeys.userFolders(user.id);

  return cacheAside(
    cacheKey,
    async () => {
      logger.info('Cache miss: getFolders', { userId: user.id });
      return getFoldersDB();
    },
    FOLDER_CACHE_TTL.userFolders
  );
}

/**
 * Invalidate folder caches for a user
 * Call this after folder mutations (create, update, delete, move)
 */
export async function invalidateFolderCachesRedis(userId: string) {
  try {
    const keysToInvalidate = [
      cacheKeys.userFolders(userId),
    ];

    await Promise.all(keysToInvalidate.map(key => cacheService.del(key)));

    logger.info('Invalidated folder caches', { userId });
  } catch (_error) {
    logger.error('Failed to invalidate folder caches', _error, { userId });
  }
}

/**
 * Warm up folder caches
 * Call this after login or on-demand
 */
export async function warmFolderCachesRedis(userId: string) {
  try {
    logger.info('Warming folder caches', { userId });
    await getFoldersRedis();
    logger.info('Folder caches warmed', { userId });
  } catch (_error) {
    logger.error('Failed to warm folder caches', _error, { userId });
  }
}
