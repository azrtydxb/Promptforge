"use server";

import { z } from 'zod';
import { cacheService, cacheKeys, cacheTTL, cacheAside, invalidateTagCaches } from '@/lib/redis';
import {
  getAllTags as _getAllTags,
  getTagsWithPrompts as _getTagsWithPrompts,
  createTag as _createTag,
  updateTag as _updateTag,
  deleteTag as _deleteTag
} from './tag-management.actions';
import { searchTags as _searchTags } from './tag.actions';

// Types for cached tag operations
export interface TagWithCount {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  _count: {
    prompts: number;
  };
}

export interface TagBase {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TagWithPrompts extends TagBase {
  prompts: Array<{
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  _count: {
    prompts: number;
  };
}

// Cached version of getAllTags
export async function getAllTags(): Promise<TagWithCount[]> {
  return cacheAside(
    cacheKeys.allTags(),
    _getAllTags,
    cacheTTL.tags
  );
}

// Cached version of getTagsWithPrompts (user-specific)
export async function getTagsWithPrompts(): Promise<TagWithPrompts[]> {
  // Note: This is user-specific, so we can't cache it globally
  // We would need the user ID to create a proper cache key
  // For now, we'll implement it without caching, but with a TODO
  // TODO: Implement user-specific caching when user context is available
  return _getTagsWithPrompts();
}

// Get popular tags with caching
export async function getPopularTags(limit: number = 10): Promise<TagWithCount[]> {
  const cacheKey = cacheKeys.popularTags(limit);
  
  return cacheAside(
    cacheKey,
    async () => {
      const tags = await getAllTags();
      return tags
        .sort((a, b) => b._count.prompts - a._count.prompts)
        .slice(0, limit);
    },
    cacheTTL.tags
  );
}

// Cached tag search with shorter TTL since it's query-specific
export async function searchTags(query: string): Promise<TagBase[]> {
  if (!query.trim()) {
    return [];
  }

  const cacheKey = `search:tags:${Buffer.from(query.toLowerCase()).toString('base64')}`;
  
  return cacheAside(
    cacheKey,
    () => _searchTags(query),
    cacheTTL.searchResults // Shorter TTL for search results
  );
}

// Get tags by IDs with caching
export async function getTagsByIds(tagIds: string[]): Promise<TagBase[]> {
  if (tagIds.length === 0) {
    return [];
  }

  // For multiple tags, we'll use a pipeline to get them efficiently
  const pipeline = cacheService.pipeline();
  const cacheKeys_tags = tagIds.map(id => `tag:${id}`);
  
  // Try to get all tags from cache first
  cacheKeys_tags.forEach(key => {
    pipeline.get(key);
  });
  const cachedResults = await pipeline.exec();
  
  const tags: TagBase[] = [];
  const missingTagIds: string[] = [];

  cachedResults?.forEach((result, index) => {
    if (result && result[1]) {
      try {
        tags.push(JSON.parse(result[1] as string));
      } catch {
        missingTagIds.push(tagIds[index]);
      }
    } else {
      missingTagIds.push(tagIds[index]);
    }
  });

  // Fetch missing tags from database
  if (missingTagIds.length > 0) {
    const { db } = await import('@/lib/db');
    const missingTags = await db.tag.findMany({
      where: {
        id: {
          in: missingTagIds
        }
      }
    });

    // Cache the missing tags
    const cachePipeline = cacheService.pipeline();
    missingTags.forEach(tag => {
      cachePipeline.setex(`tag:${tag.id}`, cacheTTL.tags, JSON.stringify(tag));
    });
    await cachePipeline.exec();

    tags.push(...missingTags);
  }

  return tags;
}

// Wrapper functions with cache invalidation for mutations

// Schema for creating tags
const createTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50, "Tag name must be less than 50 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

export async function createTagWithCache(data: z.infer<typeof createTagSchema>) {
  try {
    // Validate the input
    const validatedData = createTagSchema.parse(data);
    
    // Create the tag
    const newTag = await _createTag(validatedData);
    
    // Invalidate tag caches
    await invalidateTagCaches();
    
    // Cache the new tag individually
    await cacheService.set(`tag:${newTag.id}`, newTag, cacheTTL.tags);
    
    return newTag;
  } catch (_error) {
    throw _error;
  }
}

// Schema for updating tags
const updateTagSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Tag name is required").max(50, "Tag name must be less than 50 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

export async function updateTagWithCache(data: z.infer<typeof updateTagSchema>) {
  try {
    // Validate the input
    const validatedData = updateTagSchema.parse(data);

    // Update the tag
    const updatedTag = await _updateTag(validatedData);

    // Invalidate tag caches
    await invalidateTagCaches();

    // Update the individual tag cache
    await cacheService.set(`tag:${updatedTag.id}`, updatedTag, cacheTTL.tags);

    return updatedTag;
  } catch (_error) {
    throw _error;
  }
}

export async function deleteTagWithCache(id: string) {
  try {
    // Delete the tag
    await _deleteTag(id);

    // Invalidate tag caches
    await invalidateTagCaches();

    // Remove the individual tag from cache
    await cacheService.del(`tag:${id}`);

  } catch (_error) {
    throw _error;
  }
}

// Helper function to get tag statistics
export async function getTagStatistics(): Promise<{
  totalTags: number;
  totalTaggedPrompts: number;
  averageTagsPerPrompt: number;
  topTags: TagWithCount[];
}> {
  const cacheKey = 'tag:statistics';
  
  return cacheAside(
    cacheKey,
    async () => {
      const { db } = await import('@/lib/db');
      
      const [
        totalTags,
        totalTaggedPrompts,
        promptTagCounts,
        topTags
      ] = await Promise.all([
        db.tag.count(),
        db.prompt.count({
          where: {
            tags: {
              some: {}
            }
          }
        }),
        db.prompt.findMany({
          select: {
            _count: {
              select: {
                tags: true
              }
            }
          },
          where: {
            tags: {
              some: {}
            }
          }
        }),
        getPopularTags(5)
      ]);

      const averageTagsPerPrompt = totalTaggedPrompts > 0 
        ? promptTagCounts.reduce((sum, prompt) => sum + prompt._count.tags, 0) / totalTaggedPrompts 
        : 0;

      return {
        totalTags,
        totalTaggedPrompts,
        averageTagsPerPrompt: Math.round(averageTagsPerPrompt * 100) / 100,
        topTags
      };
    },
    cacheTTL.tags
  );
}

// Function to warm up tag caches (useful for application startup)
export async function warmTagCaches(): Promise<void> {
  try {
    // Pre-load popular data
    await Promise.all([
      getAllTags(),
      getPopularTags(10),
      getPopularTags(20),
      getTagStatistics()
    ]);
  } catch (_error) {
    // Error already logged by underlying services
  }
}

// Function to refresh tag caches (useful for admin operations)
export async function refreshTagCaches(): Promise<void> {
  try {
    // Invalidate all tag caches
    await invalidateTagCaches();

    // Warm up caches again
    await warmTagCaches();
  } catch (_error) {
    // Error already logged by underlying services
  }
}