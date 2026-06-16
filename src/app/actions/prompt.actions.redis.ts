"use server";

import { requireAuth } from "@/lib/auth";
import { cacheAside, cacheKeys, cacheService } from '@/lib/redis';
import { logger } from '@/lib/logger';
import {
  getAllPrompts as getAllPromptsDB,
  getPromptsByFolder as getPromptsByFolderDB,
  type PromptSort,
  getPromptById as getPromptByIdDB,
  searchPrompts as searchPromptsDB,
  getRecentlyUsedPrompts as getRecentlyUsedPromptsDB,
  getPinnedPrompts as getPinnedPromptsDB,
} from './prompt.actions';

/**
 * Redis-Cached Prompt Actions
 *
 * These functions wrap existing prompt actions with Redis caching
 * to improve cache hit rates from 37% to >80%.
 *
 * All caching respects REDIS_ENABLED environment variable.
 */

// Cache TTL configuration (in seconds)
const PROMPT_CACHE_TTL = {
  userPrompts: 60 * 5,      // 5 minutes - frequently modified
  promptDetails: 60 * 10,   // 10 minutes - less frequently modified
  folderPrompts: 60 * 5,    // 5 minutes - frequently modified
  searchResults: 60 * 3,    // 3 minutes - shorter TTL for search
  recentPrompts: 60 * 5,    // 5 minutes
  pinnedPrompts: 60 * 5,    // 5 minutes
};

/**
 * Get all prompts for the current user (Redis-cached)
 * Cache key: user:{userId}:prompts:all
 */
export async function getAllPromptsRedis(sort?: PromptSort) {
  const user = await requireAuth();
  const cacheKey = sort
    ? `${cacheKeys.userPrompts(user.id)}:sort:${encodeURIComponent(sort)}`
    : cacheKeys.userPrompts(user.id);

  return cacheAside(
    cacheKey,
    async () => {
      logger.info('Cache miss: getAllPrompts', { userId: user.id });
      return getAllPromptsDB(sort);
    },
    PROMPT_CACHE_TTL.userPrompts
  );
}

/**
 * Get prompts by folder (Redis-cached)
 * Cache key: folder:{folderId}:contents OR user:{userId}:prompts:no-folder
 */
export async function getPromptsByFolderRedis(folderId?: string, sort?: PromptSort) {
  const user = await requireAuth();
  const baseKey = folderId
    ? cacheKeys.folderContents(folderId)
    : `user:${user.id}:prompts:no-folder`;
  const cacheKey = sort ? `${baseKey}:sort:${encodeURIComponent(sort)}` : baseKey;

  return cacheAside(
    cacheKey,
    async () => {
      logger.info('Cache miss: getPromptsByFolder', { userId: user.id, folderId });
      return getPromptsByFolderDB(folderId, sort);
    },
    PROMPT_CACHE_TTL.folderPrompts
  );
}

/**
 * Get prompt by ID (Redis-cached)
 * Cache key: prompt:{promptId}
 */
export async function getPromptByIdRedis(id: string) {
  const cacheKey = cacheKeys.prompt(id);

  return cacheAside(
    cacheKey,
    async () => {
      logger.info('Cache miss: getPromptById', { promptId: id });
      return getPromptByIdDB(id);
    },
    PROMPT_CACHE_TTL.promptDetails
  );
}

/**
 * Search prompts (Redis-cached)
 * Cache key: user:{userId}:search:{base64(query)}
 */
export async function searchPromptsRedis(query: string) {
  if (!query.trim()) {
    return [];
  }

  const user = await requireAuth();
  const searchKey = Buffer.from(query.toLowerCase().trim()).toString('base64');
  const cacheKey = `user:${user.id}:search:${searchKey}`;

  return cacheAside(
    cacheKey,
    async () => {
      logger.info('Cache miss: searchPrompts', { userId: user.id, query });
      return searchPromptsDB(query);
    },
    PROMPT_CACHE_TTL.searchResults
  );
}

/**
 * Get recently used prompts (Redis-cached)
 * Cache key: user:{userId}:recent-prompts
 */
export async function getRecentlyUsedPromptsRedis(limit: number = 10) {
  const user = await requireAuth();
  const cacheKey = `user:${user.id}:recent-prompts:${limit}`;

  return cacheAside(
    cacheKey,
    async () => {
      logger.info('Cache miss: getRecentlyUsedPrompts', { userId: user.id, limit });
      return getRecentlyUsedPromptsDB(limit);
    },
    PROMPT_CACHE_TTL.recentPrompts
  );
}

/**
 * Get pinned prompts (Redis-cached)
 * Cache key: user:{userId}:pinned-prompts
 */
export async function getPinnedPromptsRedis() {
  const user = await requireAuth();
  const cacheKey = `user:${user.id}:pinned-prompts`;

  return cacheAside(
    cacheKey,
    async () => {
      logger.info('Cache miss: getPinnedPrompts', { userId: user.id });
      return getPinnedPromptsDB();
    },
    PROMPT_CACHE_TTL.pinnedPrompts
  );
}

/**
 * Invalidate all prompt caches for a user
 * Call this after mutations (create, update, delete, move, pin, like)
 */
export async function invalidatePromptCachesRedis(userId: string, promptId?: string) {
  try {
    const keysToInvalidate = [
      // User's all prompts
      cacheKeys.userPrompts(userId),
      // User's prompts without folder
      `user:${userId}:prompts:no-folder`,
      // Recent prompts
      `user:${userId}:recent-prompts:*`,
      // Pinned prompts
      `user:${userId}:pinned-prompts`,
    ];

    // If specific prompt, invalidate its cache
    if (promptId) {
      keysToInvalidate.push(cacheKeys.prompt(promptId));
    }

    // Invalidate folder contents (all folders for this user)
    await cacheService.delPattern(`folder:*:contents`);

    // Invalidate search caches
    await cacheService.delPattern(`user:${userId}:search:*`);

    // Delete specific keys
    await Promise.all(
      keysToInvalidate.map(key =>
        key.includes('*')
          ? cacheService.delPattern(key)
          : cacheService.del(key)
      )
    );

    logger.info('Invalidated prompt caches', { userId, promptId });
  } catch (_error) {
    logger.error('Failed to invalidate prompt caches', _error, { userId, promptId });
  }
}

/**
 * Invalidate folder-related caches
 * Call this after folder mutations (create, update, delete, move)
 */
export async function invalidateFolderCachesRedis(userId: string, folderId?: string) {
  try {
    const keysToInvalidate = [
      cacheKeys.userFolders(userId),
      `user:${userId}:prompts:no-folder`,
    ];

    if (folderId) {
      keysToInvalidate.push(cacheKeys.folderContents(folderId));
    } else {
      // Invalidate all folder contents
      await cacheService.delPattern(`folder:*:contents`);
    }

    await Promise.all(keysToInvalidate.map(key => cacheService.del(key)));

    logger.info('Invalidated folder caches', { userId, folderId });
  } catch (_error) {
    logger.error('Failed to invalidate folder caches', _error, { userId, folderId });
  }
}

/**
 * Warm up user prompt caches
 * Call this after login or on-demand
 */
export async function warmPromptCachesRedis(userId: string) {
  try {
    logger.info('Warming prompt caches', { userId });

    // Pre-load frequently accessed data
    await Promise.all([
      getAllPromptsRedis(),
      getPromptsByFolderRedis(undefined), // No folder
      getRecentlyUsedPromptsRedis(10),
      getPinnedPromptsRedis(),
    ]);

    logger.info('Prompt caches warmed', { userId });
  } catch (_error) {
    logger.error('Failed to warm prompt caches', _error, { userId });
  }
}
