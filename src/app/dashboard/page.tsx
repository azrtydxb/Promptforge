import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cache } from "react";
import { unstable_cache } from "next/cache";

// Keep force-dynamic to prevent Turbopack font loading issues
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

  // Get recently used prompts
  const recentlyUsedPrompts = await db.prompt.findMany({
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
  });

  // Get prompts with like counts
  const promptsWithLikes = await db.prompt.findMany({
    where: { userId },
    include: {
      _count: {
        select: { likes: true }
      }
    }
  });
  
  // Sort by likes manually
  const mostLikedPrompts = promptsWithLikes
    .sort((a, b) => b._count.likes - a._count.likes)
    .slice(0, 5)
    .filter(p => p._count.likes > 0);

  // Get prompts with version counts
  const promptsWithVersions = await db.prompt.findMany({
    where: { userId },
    include: {
      _count: {
        select: { versions: true }
      }
    }
  });
  
  // Sort by versions manually
  const mostVersionedPrompts = promptsWithVersions
    .sort((a, b) => b._count.versions - a._count.versions)
    .slice(0, 5)
    .filter(p => p._count.versions > 0);

  // Get prompts with favorite counts
  const promptsWithFavorites = await db.prompt.findMany({
    where: { userId },
    include: {
      _count: {
        select: { favorites: true }
      }
    }
  });
  
  // Sort by favorites manually
  const mostFavoritedPrompts = promptsWithFavorites
    .sort((a, b) => b._count.favorites - a._count.favorites)
    .slice(0, 5)
    .filter(p => p._count.favorites > 0);

  return {
    totalPrompts,
    totalFolders,
    totalTags,
    totalVersions,
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

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your prompt management activity and analytics.
          </p>
        </div>
        <DashboardAnalytics data={dashboardData} />
      </div>
    );
  } catch {
    redirect("/sign-in");
  }
}