import { db } from '@/lib/db';
import { cacheService, cacheKeys, cacheTTL } from '@/lib/redis';
import { PerformanceMonitor } from '@/lib/performance';
import { logger } from '@/lib/logger';

export class CacheWarmer {
  static async warmPopularContent() {
    logger.info('Starting cache warming for popular content');
    
    try {
      await Promise.all([
        this.cacheTrendingPrompts(),
        this.cachePopularTags(),
        this.cacheFeaturedPrompts(),
        this.cacheRecentPrompts(),
        this.cachePopularUsers(),
      ]);
      
      logger.info('Cache warming completed successfully');
    } catch (error) {
      logger.error('Cache warming failed', error);
    }
  }
  
  private static async cacheTrendingPrompts() {
    const limits = [10, 20, 50];
    
    await Promise.all(
      limits.map(async (limit) => {
        const prompts = await PerformanceMonitor.measureQuery('cache.trendingPrompts', () =>
          db.sharedPrompt.findMany({
            where: { 
              isPublished: true,
              status: 'APPROVED'
            },
            orderBy: [
              { likeCount: 'desc' }, 
              { viewCount: 'desc' },
              { publishedAt: 'desc' }
            ],
            take: limit,
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  username: true,
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
                  copies: true,
                  ratings: true
                }
              }
            }
          })
        );
        
        await PerformanceMonitor.measureCache('set.trendingPrompts', () =>
          cacheService.set(
            cacheKeys.trendingPrompts(limit),
            prompts,
            cacheTTL.trendingPrompts
          )
        );
      })
    );
  }
  
  private static async cachePopularTags() {
    const tags = await PerformanceMonitor.measureQuery('cache.popularTags', () =>
      db.tag.findMany({
        include: {
          _count: {
            select: {
              prompts: true
            }
          }
        },
        orderBy: {
          prompts: {
            _count: 'desc'
          }
        },
        take: 50
      })
    );
    
    await PerformanceMonitor.measureCache('set.popularTags', () =>
      cacheService.set(cacheKeys.allTags(), tags, cacheTTL.tags)
    );
    
    // Cache different limit variations
    const limits = [10, 20, 30];
    await Promise.all(
      limits.map(async (limit) => {
        const limitedTags = tags.slice(0, limit);
        await PerformanceMonitor.measureCache('set.popularTagsLimited', () =>
          cacheService.set(
            cacheKeys.popularTags(limit),
            limitedTags,
            cacheTTL.tags
          )
        );
      })
    );
  }
  
  private static async cacheFeaturedPrompts() {
    const featuredPrompts = await PerformanceMonitor.measureQuery('cache.featuredPrompts', () =>
      db.sharedPrompt.findMany({
        where: { 
          isPublished: true,
          status: 'APPROVED',
          visibility: 'PUBLIC'
        },
        orderBy: [
          { likeCount: 'desc' },
          { publishedAt: 'desc' }
        ],
        take: 12,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarType: true
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
              copies: true,
              ratings: true
            }
          }
        }
      })
    );
    
    await PerformanceMonitor.measureCache('set.featuredPrompts', () =>
      cacheService.set(
        cacheKeys.featuredPrompts(),
        featuredPrompts,
        cacheTTL.featuredPrompts
      )
    );
  }
  
  private static async cacheRecentPrompts() {
    const pages = [1, 2, 3];
    const limit = 12;
    
    await Promise.all(
      pages.map(async (page) => {
        const prompts = await PerformanceMonitor.measureQuery('cache.recentPrompts', () =>
          db.sharedPrompt.findMany({
            where: { 
              isPublished: true,
              status: 'APPROVED'
            },
            orderBy: { publishedAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatarType: true
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
                  copies: true,
                  ratings: true
                }
              }
            }
          })
        );
        
        await PerformanceMonitor.measureCache('set.recentPrompts', () =>
          cacheService.set(
            cacheKeys.sharedPrompts(page, limit),
            prompts,
            cacheTTL.sharedPrompts
          )
        );
      })
    );
  }
  
  private static async cachePopularUsers() {
    const users = await PerformanceMonitor.measureQuery('cache.popularUsers', () =>
      db.user.findMany({
        select: {
          id: true,
          name: true,
          username: true,
          avatarType: true,
          profilePicture: true,
          reputationScore: true,
          _count: {
            select: {
              publishedPrompts: true,
              followers: true
            }
          }
        },
        orderBy: [
          { reputationScore: 'desc' },
          { publishedPrompts: { _count: 'desc' } }
        ],
        take: 20
      })
    );
    
    await PerformanceMonitor.measureCache('set.popularUsers', () =>
      cacheService.set('popular:users', users, cacheTTL.userProfile)
    );
  }
  
  // Warm cache for specific user
  static async warmUserCache(userId: string) {
    try {
      const [user, userPrompts, userStats] = await Promise.all([
        PerformanceMonitor.measureQuery('cache.userProfile', () =>
          db.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              avatarType: true,
              profilePicture: true,
              gravatarEmail: true,
              reputationScore: true,
              role: true,
              createdAt: true,
              _count: {
                select: {
                  prompts: true,
                  publishedPrompts: true,
                  followers: true,
                  following: true
                }
              }
            }
          })
        ),
        
        PerformanceMonitor.measureQuery('cache.userPrompts', () =>
          db.prompt.findMany({
            where: { userId },
            include: {
              tags: true,
              _count: {
                select: {
                  likes: true,
                  favorites: true
                }
              }
            },
            orderBy: [
              { pinnedAt: { sort: 'desc', nulls: 'last' } },
              { updatedAt: 'desc' }
            ],
            take: 50
          })
        ),
        
        PerformanceMonitor.measureQuery('cache.userStats', () =>
          db.$queryRaw`
            SELECT 
              COUNT(*) as total_prompts,
              COUNT(CASE WHEN p."isPublished" = true THEN 1 END) as published_prompts,
              COALESCE(SUM(sp."likeCount"), 0) as total_likes,
              COALESCE(SUM(sp."viewCount"), 0) as total_views,
              COALESCE(SUM(sp."commentCount"), 0) as total_comments
            FROM "Prompt" p
            LEFT JOIN "SharedPrompt" sp ON p.id = sp."promptId"
            WHERE p."userId" = ${userId}
          `
        )
      ]);
      
      await Promise.all([
        PerformanceMonitor.measureCache('set.userProfile', () =>
          cacheService.set(cacheKeys.userProfile(userId), user, cacheTTL.userProfile)
        ),
        PerformanceMonitor.measureCache('set.userPrompts', () =>
          cacheService.set(cacheKeys.userPrompts(userId), userPrompts, cacheTTL.userStats)
        ),
        PerformanceMonitor.measureCache('set.userStats', () =>
          cacheService.set(cacheKeys.userStats(userId), userStats[0], cacheTTL.userStats)
        )
      ]);
      
      logger.info(`User cache warmed for user: ${userId}`);
    } catch (error) {
      logger.error(`Failed to warm user cache for ${userId}`, error);
    }
  }
  
  // Schedule cache warming (run every hour)
  static scheduleCacheWarming() {
    setInterval(async () => {
      await this.warmPopularContent();
    }, 60 * 60 * 1000); // 1 hour

    // DO NOT run immediately - it's called from init-performance.ts after Redis is ready
    // Removed: this.warmPopularContent();
  }
}

// Cache hierarchy implementation
export class CacheHierarchy {
  static async getWithFallback<T>(
    key: string,
    l1TTL: number,
    l2TTL: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    // Try L1 cache (Redis)
    let data = await cacheService.get<T>(key);
    if (data) return data;
    
    // Try L2 cache (Database with longer TTL)
    const l2Key = `${key}:l2`;
    data = await cacheService.get<T>(l2Key);
    if (data) {
      // Promote to L1
      await cacheService.set(key, data, l1TTL);
      return data;
    }
    
    // Fetch from source
    data = await fetchFn();
    
    // Store in both levels
    await Promise.all([
      cacheService.set(key, data, l1TTL),
      cacheService.set(l2Key, data, l2TTL)
    ]);
    
    return data;
  }
  
  // Smart cache preloading based on access patterns
  static async preloadRelatedData(key: string, data: any) {
    // Example: If caching a prompt, also cache related prompts by same author
    if (key.startsWith('prompt:') && data.authorId) {
      const authorPromptsKey = `author:${data.authorId}:prompts`;
      const cached = await cacheService.get(authorPromptsKey);
      if (!cached) {
        // Cache author's other prompts
        const authorPrompts = await db.sharedPrompt.findMany({
          where: { 
            authorId: data.authorId,
            isPublished: true,
            status: 'APPROVED'
          },
          take: 10,
          orderBy: { publishedAt: 'desc' },
          include: {
            prompt: {
              include: {
                tags: true
              }
            },
            _count: { select: { comments: true, views: true, copies: true, ratings: true } }
          }
        });
        
        await cacheService.set(authorPromptsKey, authorPrompts, cacheTTL.sharedPrompts);
      }
    }
  }
}

// Cache invalidation with smart warming
export class SmartCacheInvalidation {
  static async invalidateAndRewarm(pattern: string, warmFn?: () => Promise<void>) {
    // Invalidate existing cache
    await cacheService.delPattern(pattern);
    
    // Rewarm if function provided
    if (warmFn) {
      setTimeout(async () => {
        try {
          await warmFn();
        } catch (error) {
          logger.error('Failed to rewarm cache after invalidation', error);
        }
      }, 100); // Small delay to allow invalidation to complete
    }
  }
}