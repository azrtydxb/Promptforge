import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { unstable_cache } from "next/cache";

export const dynamic = 'force-dynamic';

// Cache the dashboard data function with React cache for request-level memoization
const getDashboardData = cache(async (userId: string) => {
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

  // Process folder data - FIX: Fetch all folders at once instead of N+1 queries
  const folderIds = promptsWithFolders
    .filter(g => g.folderId)
    .map(g => g.folderId!);

  const folders = await db.folder.findMany({
    where: { id: { in: folderIds } },
    select: { id: true, name: true }
  });

  const folderMap = new Map(folders.map(f => [f.id, f.name]));
  const folderCounts = new Map<string, number>();
  let unassignedCount = 0;

  for (const group of promptsWithFolders) {
    if (group.folderId) {
      const folderName = folderMap.get(group.folderId) || 'Unknown';
      folderCounts.set(folderName, group._count.id);
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

  // FIX: Get ALL prompt stats in ONE query instead of 4 separate queries
  const [recentlyUsedPrompts, allPromptsWithCounts] = await Promise.all([
    db.prompt.findMany({
      where: {
        userId,
        NOT: {
          lastUsedAt: null,
        },
      },
      include: {
        tags: true,
        _count: {
          select: {
            likes: true,
          },
        },
      },
      orderBy: {
        lastUsedAt: 'desc',
      },
      take: 5,
    }),
    // Single query to get all counts at once
    db.prompt.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            likes: true,
            versions: true,
            favorites: true
          }
        }
      }
    })
  ]);

  // Sort and filter for each category from the single query result
  const mostLikedPrompts = allPromptsWithCounts
    .sort((a, b) => b._count.likes - a._count.likes)
    .slice(0, 5)
    .filter(p => p._count.likes > 0);

  const mostVersionedPrompts = allPromptsWithCounts
    .sort((a, b) => b._count.versions - a._count.versions)
    .slice(0, 5)
    .filter(p => p._count.versions > 0);

  const mostFavoritedPrompts = allPromptsWithCounts
    .sort((a, b) => b._count.favorites - a._count.favorites)
    .slice(0, 5)
    .filter(p => p._count.favorites > 0);

  // Real KPI extras: used-this-week, avg rating, and simple week-over-week deltas.
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const twoWeeksAgo = new Date(Date.now() - 14 * 864e5);
  const [usedThisWeek, usedPriorWeek, createdThisWeek, ratingAgg] = await Promise.all([
    db.prompt.count({ where: { userId, lastUsedAt: { gte: weekAgo } } }),
    db.prompt.count({ where: { userId, lastUsedAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    db.prompt.count({ where: { userId, createdAt: { gte: weekAgo } } }),
    db.prompt.aggregate({ where: { userId }, _avg: { averageRating: true } }),
  ]);
  const avgRating = Math.round((ratingAgg._avg.averageRating ?? 0) * 10) / 10;
  const promptsDelta = totalPrompts ? Math.round((createdThisWeek / totalPrompts) * 100) : 0;
  const usedDelta = usedPriorWeek
    ? Math.round(((usedThisWeek - usedPriorWeek) / usedPriorWeek) * 100)
    : (usedThisWeek > 0 ? 100 : 0);

  return {
    totalPrompts,
    totalFolders,
    totalTags,
    totalVersions,
    usedThisWeek,
    avgRating,
    promptsDelta,
    usedDelta,
    promptsByMonth,
    promptsByFolder,
    topTags,
    recentActivity,
    promptGrowth,
    recentlyUsedPrompts,
    mostLikedPrompts,
    mostVersionedPrompts,
    mostFavoritedPrompts
  };
});

// Create a cached version using unstable_cache for longer-term caching
const getCachedDashboardData = unstable_cache(
  async (userId: string) => {
    return await getDashboardData(userId);
  },
  ['dashboard-data'],
  {
    revalidate: 300, // 5 minutes
    tags: ['dashboard', 'user-data']
  }
);

export default async function Dashboard() {
  try {
    const user = await requireAuth();
    const dashboardData = await getCachedDashboardData(user.id);

    return <DashboardAnalytics data={dashboardData} />;
  } catch {
    redirect("/sign-in");
  }
}