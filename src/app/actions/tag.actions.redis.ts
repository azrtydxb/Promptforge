"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { cacheAside, cacheKeys, cacheService } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { searchTags as searchTagsDB } from './tag.actions';

/**
 * Redis-Cached Tag Actions
 *
 * These functions wrap existing tag actions with Redis caching
 * to improve cache hit rates.
 */

// Cache TTL configuration (in seconds)
const TAG_CACHE_TTL = {
  allTags: 60 * 30,      // 30 minutes - tags are very stable
  searchResults: 60 * 15, // 15 minutes - tag searches are stable
  userTags: 60 * 15,     // 15 minutes
};

/**
 * Get all tags (Redis-cached)
 * Cache key: tags:all
 */
export async function getAllTagsRedis() {
  const cacheKey = cacheKeys.allTags();

  return cacheAside(
    cacheKey,
    async () => {
      logger.info('Cache miss: getAllTags');
      const tags = await db.tag.findMany({
        orderBy: {
          name: 'asc',
        },
        include: {
          _count: {
            select: {
              prompts: true,
            },
          },
        },
      });
      return tags;
    },
    TAG_CACHE_TTL.allTags
  );
}

/**
 * Search tags (Redis-cached)
 * Cache key: tags:search:{base64(query)}
 */
export async function searchTagsRedis(query: string) {
  if (!query.trim()) {
    return [];
  }

  const searchKey = Buffer.from(query.toLowerCase().trim()).toString('base64');
  const cacheKey = `tags:search:${searchKey}`;

  return cacheAside(
    cacheKey,
    async () => {
      logger.info('Cache miss: searchTags', { query });
      return searchTagsDB(query);
    },
    TAG_CACHE_TTL.searchResults
  );
}

/**
 * Get tags for a specific user (Redis-cached)
 * Cache key: user:{userId}:tags
 */
export async function getUserTagsRedis() {
  const user = await requireAuth();
  const cacheKey = cacheKeys.userTags(user.id);

  return cacheAside(
    cacheKey,
    async () => {
      logger.info('Cache miss: getUserTags', { userId: user.id });

      // Get all tags used by this user's prompts
      const tags = await db.tag.findMany({
        where: {
          prompts: {
            some: {
              userId: user.id,
            },
          },
        },
        include: {
          _count: {
            select: {
              prompts: {
                where: {
                  userId: user.id,
                },
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      return tags;
    },
    TAG_CACHE_TTL.userTags
  );
}

/**
 * Get popular tags (Redis-cached)
 * Cache key: tags:popular:{limit}
 */
export async function getPopularTagsRedis(limit: number = 50) {
  const cacheKey = cacheKeys.popularTags(limit);

  return cacheAside(
    cacheKey,
    async () => {
      logger.info('Cache miss: getPopularTags', { limit });

      const tags = await db.tag.findMany({
        include: {
          _count: {
            select: {
              prompts: true,
            },
          },
        },
        orderBy: {
          prompts: {
            _count: 'desc',
          },
        },
        take: limit,
      });

      return tags;
    },
    TAG_CACHE_TTL.allTags
  );
}

/**
 * Invalidate tag caches
 * Call this after tag mutations (create, update, delete, connect, disconnect)
 */
export async function invalidateTagCachesRedis(userId?: string) {
  try {
    const keysToInvalidate = [
      cacheKeys.allTags(),
    ];

    if (userId) {
      keysToInvalidate.push(cacheKeys.userTags(userId));
    }

    // Invalidate all tag search caches
    await cacheService.delPattern('tags:search:*');

    // Invalidate all popular tags variations
    await cacheService.delPattern('tags:popular*');

    // Delete specific keys
    await Promise.all(keysToInvalidate.map(key => cacheService.del(key)));

    logger.info('Invalidated tag caches', { userId });
  } catch (_error) {
    logger.error('Failed to invalidate tag caches', _error, { userId });
  }
}

/**
 * Warm up tag caches
 * Call this on application startup or scheduled intervals
 */
export async function warmTagCachesRedis() {
  try {
    logger.info('Warming tag caches');

    await Promise.all([
      getAllTagsRedis(),
      getPopularTagsRedis(50),
      getPopularTagsRedis(20),
      getPopularTagsRedis(10),
    ]);

    logger.info('Tag caches warmed');
  } catch (_error) {
    logger.error('Failed to warm tag caches', error);
  }
}
