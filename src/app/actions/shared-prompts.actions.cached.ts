"use server";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { cacheService, cacheTTL, cacheAside } from '@/lib/redis';
import { db } from '@/lib/db';
import { Prisma } from '@/generated/prisma';

// Types for shared prompts
export interface SharedPromptFilters {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  sortBy?: 'recent' | 'popular' | 'liked' | 'copied';
  authorId?: string;
}

export interface SharedPromptResult {
  success: boolean;
  prompts?: unknown[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  error?: string;
}

export interface SharedPromptDetails {
  success: boolean;
  prompt?: unknown;
  error?: string;
}

// Generate cache key for shared prompts list
function generateSharedPromptsKey(filters: SharedPromptFilters): string {
  const { page = 1, limit = 12, search = '', tags = [], sortBy = 'recent', authorId } = filters;
  
  const keyParts = [
    'shared-prompts',
    `page:${page}`,
    `limit:${limit}`,
    `sort:${sortBy}`
  ];
  
  if (search) {
    keyParts.push(`search:${Buffer.from(search.toLowerCase()).toString('base64')}`);
  }
  
  if (tags.length > 0) {
    keyParts.push(`tags:${tags.sort().join(',')}`);
  }
  
  if (authorId) {
    keyParts.push(`author:${authorId}`);
  }
  
  return keyParts.join(':');
}

// Cached version of getSharedPrompts
export async function getSharedPromptsCached(filters: SharedPromptFilters = {}): Promise<SharedPromptResult> {
  const cacheKey = generateSharedPromptsKey(filters);
  
  return cacheAside(
    cacheKey,
    async () => {
      try {
        const session = await getServerSession(authOptions);
        const { page = 1, limit = 12, search = '', tags = [], sortBy = 'recent', authorId } = filters;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Prisma.SharedPromptWhereInput = {
          isPublished: true,
          status: 'APPROVED'
        };

        if (search) {
          where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } }
          ];
        }

        if (tags.length > 0) {
          where.prompt = {
            tags: {
              some: {
                name: { in: tags }
              }
            }
          };
        }

        if (authorId) {
          where.authorId = authorId;
        }

        // Build order by clause
        let orderBy: Prisma.SharedPromptOrderByWithRelationInput = { publishedAt: 'desc' };

        switch (sortBy) {
          case 'popular':
            orderBy = { viewCount: 'desc' };
            break;
          case 'liked':
            orderBy = { likeCount: 'desc' };
            break;
          case 'copied':
            orderBy = { copyCount: 'desc' };
            break;
        }

        // Get shared prompts
        const [prompts, total] = await Promise.all([
          db.sharedPrompt.findMany({
            where,
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  avatarType: true,
                  profilePicture: true
                }
              },
              prompt: {
                include: {
                  tags: true
                }
              },
              _count: {
                select: {
                  comments: true,
                  views: true,
                  copies: true
                }
              }
            },
            orderBy,
            skip,
            take: limit
          }),
          db.sharedPrompt.count({ where })
        ]);

        // Check if user has liked these prompts (this part can't be cached globally)
        let promptsWithLikeStatus = prompts;
        if (session?.user?.id) {
          const likedPrompts = await db.promptLike.findMany({
            where: {
              userId: session.user.id,
              promptId: { in: prompts.map(p => p.promptId) }
            }
          });
          
          const likedSet = new Set(likedPrompts.map(like => like.promptId));
          
          promptsWithLikeStatus = prompts.map(prompt => ({
            ...prompt,
            isLiked: likedSet.has(prompt.promptId)
          }));
        }

        return {
          success: true,
          prompts: promptsWithLikeStatus,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          }
        };

      } catch (_error) {
        return { success: false, error: 'Failed to load shared prompts' };
      }
    },
    cacheTTL.sharedPrompts
  );
}

// Cached version of getSharedPrompt (single prompt details)
export async function getSharedPromptCached(id: string): Promise<SharedPromptDetails> {
  const cacheKey = `shared-prompt:${id}`;
  
  return cacheAside(
    cacheKey,
    async () => {
      try {
        const session = await getServerSession(authOptions);

        const sharedPrompt = await db.sharedPrompt.findUnique({
          where: { 
            id,
            isPublished: true,
            status: 'APPROVED'
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                name: true,
                avatarType: true,
                profilePicture: true,
                reputationScore: true
              }
            },
            prompt: {
              include: {
                tags: true
              }
            },
            comments: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    avatarType: true,
                    profilePicture: true
                  }
                },
                replies: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        name: true,
                        avatarType: true,
                        profilePicture: true
                      }
                    }
                  }
                }
              },
              where: {
                parentId: null // Only top-level comments
              },
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        });

        if (!sharedPrompt) {
          return { success: false, error: 'Shared prompt not found' };
        }

        // Check if user has liked this prompt (this part can't be cached globally)
        let isLiked = false;
        if (session?.user?.id) {
          const like = await db.promptLike.findFirst({
            where: {
              userId: session.user.id,
              promptId: sharedPrompt.promptId
            }
          });
          isLiked = !!like;
        }

        return {
          success: true,
          prompt: {
            ...sharedPrompt,
            isLiked
          }
        };

      } catch (_error) {
        return { success: false, error: 'Failed to load shared prompt' };
      }
    },
    cacheTTL.sharedPrompts
  );
}

// Get popular shared prompts with caching
export async function getPopularSharedPromptsCached(limit: number = 10) {
  const cacheKey = `popular-shared-prompts:${limit}`;
  
  return cacheAside(
    cacheKey,
    async () => {
      return getSharedPromptsCached({
        limit,
        sortBy: 'popular'
      });
    },
    cacheTTL.sharedPrompts
  );
}

// Get recent shared prompts with caching
export async function getRecentSharedPromptsCached(limit: number = 10) {
  const cacheKey = `recent-shared-prompts:${limit}`;
  
  return cacheAside(
    cacheKey,
    async () => {
      return getSharedPromptsCached({
        limit,
        sortBy: 'recent'
      });
    },
    cacheTTL.sharedPrompts
  );
}

// Get shared prompts by author with caching
export async function getSharedPromptsByAuthorCached(authorId: string, limit: number = 10) {
  const cacheKey = `author-shared-prompts:${authorId}:${limit}`;
  
  return cacheAside(
    cacheKey,
    async () => {
      return getSharedPromptsCached({
        authorId,
        limit,
        sortBy: 'recent'
      });
    },
    cacheTTL.sharedPrompts
  );
}

// Get shared prompts by tags with caching
export async function getSharedPromptsByTagsCached(tags: string[], limit: number = 10) {
  const cacheKey = `tagged-shared-prompts:${tags.sort().join(',')}:${limit}`;
  
  return cacheAside(
    cacheKey,
    async () => {
      return getSharedPromptsCached({
        tags,
        limit,
        sortBy: 'popular'
      });
    },
    cacheTTL.sharedPrompts
  );
}

// Search shared prompts with caching (shorter TTL for search results)
export async function searchSharedPromptsCached(query: string, limit: number = 10) {
  if (!query.trim()) {
    return { success: true, prompts: [], pagination: { page: 1, limit, total: 0, pages: 0, hasNext: false, hasPrev: false } };
  }

  const cacheKey = `search-shared-prompts:${Buffer.from(query.toLowerCase()).toString('base64')}:${limit}`;
  
  return cacheAside(
    cacheKey,
    async () => {
      return getSharedPromptsCached({
        search: query,
        limit,
        sortBy: 'popular'
      });
    },
    cacheTTL.searchResults
  );
}

// Get shared prompts statistics with caching
export async function getSharedPromptsStatsCached() {
  const cacheKey = 'shared-prompts:stats';
  
  return cacheAside(
    cacheKey,
    async () => {
      const [
        totalPublished,
        totalAuthors,
        totalViews,
        totalLikes,
        totalComments,
        totalCopies,
        topAuthors,
        topTags
      ] = await Promise.all([
        db.sharedPrompt.count({
          where: { isPublished: true, status: 'APPROVED' }
        }),
        db.sharedPrompt.groupBy({
          by: ['authorId'],
          where: { isPublished: true, status: 'APPROVED' },
          _count: { authorId: true }
        }).then(result => result.length),
        db.sharedPrompt.aggregate({
          where: { isPublished: true, status: 'APPROVED' },
          _sum: { viewCount: true }
        }).then(result => result._sum.viewCount || 0),
        db.sharedPrompt.aggregate({
          where: { isPublished: true, status: 'APPROVED' },
          _sum: { likeCount: true }
        }).then(result => result._sum.likeCount || 0),
        db.sharedPrompt.aggregate({
          where: { isPublished: true, status: 'APPROVED' },
          _sum: { commentCount: true }
        }).then(result => result._sum.commentCount || 0),
        db.sharedPrompt.aggregate({
          where: { isPublished: true, status: 'APPROVED' },
          _sum: { copyCount: true }
        }).then(result => result._sum.copyCount || 0),
        db.sharedPrompt.groupBy({
          by: ['authorId'],
          where: { isPublished: true, status: 'APPROVED' },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 5
        }),
        db.tag.findMany({
          include: {
            prompts: {
              include: {
                sharedPrompt: {
                  where: { isPublished: true, status: 'APPROVED' }
                }
              }
            }
          },
          orderBy: {
            prompts: { _count: 'desc' }
          },
          take: 10
        })
      ]);

      return {
        totalPublished,
        totalAuthors,
        totalViews,
        totalLikes,
        totalComments,
        totalCopies,
        averageViewsPerPrompt: totalPublished > 0 ? Math.round(totalViews / totalPublished) : 0,
        averageLikesPerPrompt: totalPublished > 0 ? Math.round((totalLikes / totalPublished) * 100) / 100 : 0,
        topAuthors: topAuthors.slice(0, 5),
        topTags: topTags.filter(tag => 
          tag.prompts.some(prompt => prompt.sharedPrompt)
        ).slice(0, 5)
      };
    },
    cacheTTL.dashboardAnalytics
  );
}

// Function to invalidate shared prompts caches
export async function invalidateSharedPromptsCaches(): Promise<void> {
  try {
    await Promise.all([
      cacheService.delPattern('shared-prompts:*'),
      cacheService.delPattern('shared-prompt:*'),
      cacheService.delPattern('popular-shared-prompts:*'),
      cacheService.delPattern('recent-shared-prompts:*'),
      cacheService.delPattern('author-shared-prompts:*'),
      cacheService.delPattern('tagged-shared-prompts:*'),
      cacheService.delPattern('search-shared-prompts:*')
    ]);
  } catch (_error) {
    // Error already logged by underlying services
  }
}

// Function to warm up shared prompts caches
export async function warmSharedPromptsCaches(): Promise<void> {
  try {
    await Promise.all([
      getSharedPromptsCached({ limit: 12, sortBy: 'recent' }),
      getSharedPromptsCached({ limit: 12, sortBy: 'popular' }),
      getPopularSharedPromptsCached(10),
      getRecentSharedPromptsCached(10),
      getSharedPromptsStatsCached()
    ]);
  } catch (_error) {
    // Error already logged by underlying services
  }
}

// Function to refresh shared prompts caches
export async function refreshSharedPromptsCaches(): Promise<void> {
  try {
    // Invalidate caches
    await invalidateSharedPromptsCaches();

    // Warm up caches again
    await warmSharedPromptsCaches();
  } catch (_error) {
    // Error already logged by underlying services
  }
}