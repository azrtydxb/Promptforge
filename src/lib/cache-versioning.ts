import { db } from '@/lib/db';
import { cacheService } from '@/lib/redis';
import { logger } from '@/lib/logger';

/**
 * Cache Versioning System
 *
 * Instead of using SCAN operations (which are slow and expensive),
 * this system uses versioned cache keys. When data changes, we increment
 * the version number, effectively invalidating all old caches without
 * needing to delete them.
 *
 * Pattern: {prefix}:v{version}:{rest-of-key}
 * Example: shared-prompts:v2:page:1:limit:12
 *
 * Benefits:
 * - No SCAN operations required
 * - O(1) invalidation time (just increment a counter)
 * - Old cache entries expire naturally via TTL
 * - Better performance under load
 */

export enum CacheGroup {
  SHARED_PROMPTS = 'shared-prompts',
  USER_PROMPTS = 'user-prompts',
  ANALYTICS = 'analytics',
  TAGS = 'tags',
  TRENDING = 'trending',
  SEARCH = 'search',
  USER_PROFILE = 'user-profile',
  COLLECTIONS = 'collections',
  FOLDERS = 'folders',
}

/**
 * Get current version for a cache group
 */
export async function getCacheVersion(group: CacheGroup): Promise<number> {
  try {
    // Try Redis first for performance
    const redisKey = `cache-version:${group}`;
    const cachedVersion = await cacheService.get<number>(redisKey);

    if (cachedVersion !== null) {
      return cachedVersion;
    }

    // Fallback to database
    const versionRecord = await db.cacheVersion.findUnique({
      where: { group },
    });

    const version = versionRecord?.version || 1;

    // Cache the version for 1 hour
    await cacheService.set(redisKey, version, 60 * 60);

    return version;
  } catch (error) {
    logger.error(`Failed to get cache version for group ${group}`, error);
    // Fail safe - return version 1
    return 1;
  }
}

/**
 * Increment cache version for a group (invalidates all caches in that group)
 */
export async function incrementCacheVersion(group: CacheGroup): Promise<number> {
  try {
    // Update version in database using atomic increment
    const updated = await db.cacheVersion.upsert({
      where: { group },
      update: {
        version: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        group,
        version: 2, // Start at 2 when creating
      },
    });

    // Update Redis cache
    const redisKey = `cache-version:${group}`;
    await cacheService.set(redisKey, updated.version, 60 * 60);

    logger.info(`Incremented cache version for group ${group}`, {
      group,
      newVersion: updated.version
    });

    return updated.version;
  } catch (error) {
    logger.error(`Failed to increment cache version for group ${group}`, error);
    throw error;
  }
}

/**
 * Build versioned cache key
 *
 * @param group - Cache group (used for versioning)
 * @param keyParts - Parts to build the cache key
 * @returns Versioned cache key in format: {group}:v{version}:{parts}
 *
 * @example
 * await buildVersionedKey(CacheGroup.SHARED_PROMPTS, 'page:1', 'limit:12')
 * // Returns: "shared-prompts:v3:page:1:limit:12"
 */
export async function buildVersionedKey(
  group: CacheGroup,
  ...keyParts: (string | number)[]
): Promise<string> {
  const version = await getCacheVersion(group);
  const parts = [group, `v${version}`, ...keyParts];
  return parts.join(':');
}

/**
 * Invalidate cache group by incrementing version
 * This is much faster than delPattern as it's O(1) instead of O(N)
 */
export async function invalidateCacheGroup(group: CacheGroup): Promise<void> {
  try {
    await incrementCacheVersion(group);
    logger.info(`Invalidated cache group: ${group}`);
  } catch (error) {
    logger.error(`Failed to invalidate cache group ${group}`, error);
  }
}

/**
 * Invalidate multiple cache groups atomically
 */
export async function invalidateCacheGroups(...groups: CacheGroup[]): Promise<void> {
  try {
    await Promise.all(groups.map(group => invalidateCacheGroup(group)));
    logger.info(`Invalidated ${groups.length} cache groups`, { groups });
  } catch (error) {
    logger.error('Failed to invalidate cache groups', error, { groups });
  }
}

/**
 * Get all cache versions (for debugging/monitoring)
 */
export async function getAllCacheVersions(): Promise<Record<string, number>> {
  try {
    const versions = await db.cacheVersion.findMany();

    return versions.reduce((acc, v) => {
      acc[v.group] = v.version;
      return acc;
    }, {} as Record<string, number>);
  } catch (error) {
    logger.error('Failed to get all cache versions', error);
    return {};
  }
}

/**
 * Reset cache version for a group (use with caution)
 */
export async function resetCacheVersion(group: CacheGroup): Promise<void> {
  try {
    await db.cacheVersion.upsert({
      where: { group },
      update: {
        version: 1,
        updatedAt: new Date(),
      },
      create: {
        group,
        version: 1,
      },
    });

    // Clear Redis cache
    const redisKey = `cache-version:${group}`;
    await cacheService.del(redisKey);

    logger.info(`Reset cache version for group ${group}`);
  } catch (error) {
    logger.error(`Failed to reset cache version for group ${group}`, error);
    throw error;
  }
}

/**
 * Helper to wrap cache operations with versioning
 *
 * @example
 * const data = await versionedCache(
 *   CacheGroup.SHARED_PROMPTS,
 *   async (versionedKey) => {
 *     return cacheAside(versionedKey, fetchFunction, ttl);
 *   },
 *   'page:1', 'limit:12'
 * );
 */
export async function versionedCache<T>(
  group: CacheGroup,
  cacheOperation: (versionedKey: string) => Promise<T>,
  ...keyParts: (string | number)[]
): Promise<T> {
  const versionedKey = await buildVersionedKey(group, ...keyParts);
  return cacheOperation(versionedKey);
}

/**
 * Initialize cache versions for all groups
 */
export async function initializeCacheVersions(): Promise<void> {
  try {
    const groups = Object.values(CacheGroup);

    await Promise.all(
      groups.map(group =>
        db.cacheVersion.upsert({
          where: { group },
          update: {}, // Don't change existing versions
          create: {
            group,
            version: 1,
          },
        })
      )
    );

    logger.info('Initialized cache versions for all groups');
  } catch (error) {
    logger.error('Failed to initialize cache versions', error);
  }
}
