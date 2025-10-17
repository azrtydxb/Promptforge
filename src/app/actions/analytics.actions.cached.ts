"use server";

import { cacheService, cacheKeys, cacheTTL, cacheAside, invalidateUserCaches } from '@/lib/redis';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Types for analytics data
export interface DashboardData {
  totalPrompts: number;
  totalFolders: number;
  totalTags: number;
  totalVersions: number;
  promptsByMonth: Array<{ month: string; count: number }>;
  promptsByFolder: Array<{ name: string; count: number }>;
  topTags: Array<{ name: string; count: number }>;
  recentActivity: Array<{ id: string; title: string; type: string; createdAt: string }>;
  promptGrowth: Array<{ date: string; prompts: number; cumulative: number }>;
}

export interface UserStats {
  totalPrompts: number;
  totalFolders: number;
  totalTags: number;
  totalVersions: number;
  totalLikes: number;
  totalSharedPrompts: number;
  averagePromptsPerFolder: number;
  mostUsedTags: string[];
}

export interface GlobalAnalytics {
  totalUsers: number;
  totalPrompts: number;
  totalSharedPrompts: number;
  totalTags: number;
  totalFolders: number;
  averagePromptsPerUser: number;
  topTags: Array<{ name: string; count: number }>;
  recentActivity: Array<{ type: string; count: number; date: string }>;
}

// Cached version of getDashboardData
export async function getDashboardDataCached(userId: string): Promise<DashboardData> {
  const cacheKey = cacheKeys.dashboardAnalytics(userId);
  
  return cacheAside(
    cacheKey,
    async () => {
      const [
        totalPrompts,
        totalFolders,
        totalTags,
        totalVersions,
        promptsWithDates,
        promptsWithFolders,
        tagsWithCounts,
        recentPrompts
      ] = await Promise.all([
        // Total counts
        db.prompt.count({ where: { userId } }),
        db.folder.count({ where: { userId } }),
        db.tag.count(),
        db.promptVersion.count({
          where: { prompt: { userId } }
        }),
        
        // Prompts with creation dates for trends
        db.prompt.findMany({
          where: { userId },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' }
        }),
        
        // Prompts by folder
        db.prompt.groupBy({
          by: ['folderId'],
          where: { userId },
          _count: { id: true }
        }),
        
        // Tags with prompt counts
        db.tag.findMany({
          include: {
            prompts: {
              where: { userId },
              select: { id: true }
            }
          },
          orderBy: {
            prompts: {
              _count: 'desc'
            }
          },
          take: 10
        }),
        
        // Recent activity
        db.prompt.findMany({
          where: { userId },
          select: {
            id: true,
            title: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      ]);

      // Process monthly data
      const monthlyData = new Map<string, number>();
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      
      for (let d = new Date(sixMonthsAgo); d <= now; d.setMonth(d.getMonth() + 1)) {
        const monthKey = d.toISOString().slice(0, 7); // YYYY-MM format
        monthlyData.set(monthKey, 0);
      }
      
      promptsWithDates.forEach(prompt => {
        const monthKey = prompt.createdAt.toISOString().slice(0, 7);
        if (monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + 1);
        }
      });

      const promptsByMonth = Array.from(monthlyData.entries()).map(([month, count]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        count
      }));

      // Process folder data
      const folderCounts = new Map<string, number>();
      let unassignedCount = 0;
      
      for (const group of promptsWithFolders) {
        if (group.folderId) {
          const folder = await db.folder.findUnique({
            where: { id: group.folderId },
            select: { name: true }
          });
          folderCounts.set(folder?.name || 'Unknown', group._count.id);
        } else {
          unassignedCount = group._count.id;
        }
      }
      
      if (unassignedCount > 0) {
        folderCounts.set('Unassigned', unassignedCount);
      }

      const promptsByFolder = Array.from(folderCounts.entries()).map(([name, count]) => ({
        name,
        count
      }));

      // Process tag data
      const topTags = tagsWithCounts
        .filter(tag => tag.prompts.length > 0)
        .map(tag => ({
          name: tag.name,
          count: tag.prompts.length
        }))
        .slice(0, 5);

      // Process growth data
      const growthData = new Map<string, { new: number; cumulative: number }>();
      let cumulative = 0;
      
      promptsWithDates.forEach(prompt => {
        const dateKey = prompt.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
        if (!growthData.has(dateKey)) {
          growthData.set(dateKey, { new: 0, cumulative: 0 });
        }
        const data = growthData.get(dateKey)!;
        data.new += 1;
        cumulative += 1;
        data.cumulative = cumulative;
      });

      // Get last 30 days of growth data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const promptGrowth = Array.from(growthData.entries())
        .filter(([date]) => new Date(date) >= thirtyDaysAgo)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          prompts: data.new,
          cumulative: data.cumulative
        }));

      // Recent activity
      const recentActivity = recentPrompts.map(prompt => ({
        id: prompt.id,
        title: prompt.title,
        type: 'Prompt Created',
        createdAt: prompt.createdAt.toISOString()
      }));

      return {
        totalPrompts,
        totalFolders,
        totalTags,
        totalVersions,
        promptsByMonth,
        promptsByFolder,
        topTags,
        recentActivity,
        promptGrowth
      };
    },
    cacheTTL.dashboardAnalytics
  );
}

// Get user statistics with caching
export async function getUserStatsCached(userId: string): Promise<UserStats> {
  const cacheKey = cacheKeys.userStats(userId);
  
  return cacheAside(
    cacheKey,
    async () => {
      const [
        totalPrompts,
        totalFolders,
        totalVersions,
        totalLikes,
        totalSharedPrompts,
        userTags,
        foldersWithPrompts
      ] = await Promise.all([
        db.prompt.count({ where: { userId } }),
        db.folder.count({ where: { userId } }),
        db.promptVersion.count({ where: { prompt: { userId } } }),
        db.promptLike.count({ where: { prompt: { userId } } }),
        db.sharedPrompt.count({ where: { authorId: userId } }),
        db.tag.findMany({
          include: {
            prompts: {
              where: { userId },
              select: { id: true }
            }
          },
          orderBy: {
            prompts: {
              _count: 'desc'
            }
          },
          take: 5
        }),
        db.folder.findMany({
          where: { userId },
          include: {
            _count: {
              select: { prompts: true }
            }
          }
        })
      ]);

      const totalTags = userTags.filter(tag => tag.prompts.length > 0).length;
      const averagePromptsPerFolder = totalFolders > 0 
        ? Math.round((foldersWithPrompts.reduce((sum, folder) => sum + folder._count.prompts, 0) / totalFolders) * 100) / 100
        : 0;
      
      const mostUsedTags = userTags
        .filter(tag => tag.prompts.length > 0)
        .map(tag => tag.name)
        .slice(0, 5);

      return {
        totalPrompts,
        totalFolders,
        totalTags,
        totalVersions,
        totalLikes,
        totalSharedPrompts,
        averagePromptsPerFolder,
        mostUsedTags
      };
    },
    cacheTTL.dashboardAnalytics
  );
}

// Get global analytics (admin/public stats)
export async function getGlobalAnalyticsCached(): Promise<GlobalAnalytics> {
  const cacheKey = cacheKeys.globalAnalytics();
  
  return cacheAside(
    cacheKey,
    async () => {
      const [
        totalUsers,
        totalPrompts,
        totalSharedPrompts,
        totalTags,
        totalFolders,
        topTags,
        recentActivity
      ] = await Promise.all([
        db.user.count(),
        db.prompt.count(),
        db.sharedPrompt.count({ where: { isPublished: true } }),
        db.tag.count(),
        db.folder.count(),
        db.tag.findMany({
          include: {
            _count: {
              select: { prompts: true }
            }
          },
          orderBy: {
            prompts: {
              _count: 'desc'
            }
          },
          take: 10
        }),
        // Get activity from the last 7 days
        db.prompt.groupBy({
          by: ['createdAt'],
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          _count: { id: true }
        })
      ]);

      const averagePromptsPerUser = totalUsers > 0 ? Math.round((totalPrompts / totalUsers) * 100) / 100 : 0;
      
      const topTagsFormatted = topTags.map(tag => ({
        name: tag.name,
        count: tag._count.prompts
      }));

      // Process recent activity by day
      const activityByDay = new Map<string, number>();
      recentActivity.forEach(activity => {
        const dateKey = activity.createdAt.toISOString().slice(0, 10);
        activityByDay.set(dateKey, (activityByDay.get(dateKey) || 0) + activity._count.id);
      });

      const recentActivityFormatted = Array.from(activityByDay.entries()).map(([date, count]) => ({
        type: 'Prompts Created',
        count,
        date
      }));

      return {
        totalUsers,
        totalPrompts,
        totalSharedPrompts,
        totalTags,
        totalFolders,
        averagePromptsPerUser,
        topTags: topTagsFormatted,
        recentActivity: recentActivityFormatted
      };
    },
    cacheTTL.globalAnalytics
  );
}

// Get trending prompts with caching
export async function getTrendingPromptsCached(limit: number = 10) {
  const cacheKey = `trending:prompts:${limit}`;
  
  return cacheAside(
    cacheKey,
    async () => {
      // Get prompts with high engagement in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const trendingPrompts = await db.sharedPrompt.findMany({
        where: {
          isPublished: true,
          status: 'APPROVED',
          publishedAt: {
            gte: thirtyDaysAgo
          }
        },
        select: {
          id: true,
          title: true,
          description: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          copyCount: true,
          publishedAt: true,
          author: {
            select: {
              username: true,
              name: true
            }
          }
        },
        orderBy: [
          { likeCount: 'desc' },
          { viewCount: 'desc' },
          { commentCount: 'desc' }
        ],
        take: limit
      });

      return trendingPrompts.map(prompt => ({
        ...prompt,
        engagementScore: prompt.likeCount * 3 + prompt.commentCount * 2 + prompt.copyCount * 4 + Math.floor(prompt.viewCount / 10)
      }));
    },
    cacheTTL.trendingPrompts
  );
}

// Wrapper function for dashboard that requires auth
export async function getDashboardDataForCurrentUser(): Promise<DashboardData> {
  const user = await requireAuth();
  return getDashboardDataCached(user.id);
}

// Wrapper function for user stats that requires auth
export async function getUserStatsForCurrentUser(): Promise<UserStats> {
  const user = await requireAuth();
  return getUserStatsCached(user.id);
}

// Function to invalidate analytics caches for a user
export async function invalidateUserAnalytics(userId: string): Promise<void> {
  try {
    await Promise.all([
      cacheService.del(cacheKeys.dashboardAnalytics(userId)),
      cacheService.del(cacheKeys.userStats(userId)),
      invalidateUserCaches(userId)
    ]);
  } catch (_error) {
    // Error already logged by underlying services
  }
}

// Function to invalidate global analytics
export async function invalidateGlobalAnalytics(): Promise<void> {
  try {
    await Promise.all([
      cacheService.del(cacheKeys.globalAnalytics()),
      cacheService.delPattern('trending:*')
    ]);
  } catch (_error) {
    // Error already logged by underlying services
  }
}

// Function to warm up analytics caches
export async function warmAnalyticsCaches(userId?: string): Promise<void> {
  try {
    const promises: Promise<unknown>[] = [
      getGlobalAnalyticsCached(),
      getTrendingPromptsCached(10),
      getTrendingPromptsCached(20)
    ];

    if (userId) {
      promises.push(
        getDashboardDataCached(userId),
        getUserStatsCached(userId)
      );
    }

    await Promise.all(promises);
  } catch (_error) {
    // Error already logged by underlying services
  }
}

// Function to refresh analytics caches
export async function refreshAnalyticsCaches(userId?: string): Promise<void> {
  try {
    // Invalidate caches
    await invalidateGlobalAnalytics();
    if (userId) {
      await invalidateUserAnalytics(userId);
    }

    // Warm up caches again
    await warmAnalyticsCaches(userId);
  } catch (_error) {
    // Error already logged by underlying services
  }
}