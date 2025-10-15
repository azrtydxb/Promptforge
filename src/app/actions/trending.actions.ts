'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { db } from '@/lib/db';
import { unstable_cache } from 'next/cache';

// Time period configurations
const TIME_PERIODS = {
  today: {
    label: 'Today',
    hours: 24,
    dateFilter: () => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      return date;
    }
  },
  week: {
    label: 'This Week',
    hours: 24 * 7,
    dateFilter: () => {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return date;
    }
  },
  month: {
    label: 'This Month',
    hours: 24 * 30,
    dateFilter: () => {
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      return date;
    }
  },
  all: {
    label: 'All Time',
    hours: null,
    dateFilter: () => new Date(0) // Beginning of time
  }
} as const;

export type TimePeriod = keyof typeof TIME_PERIODS;
export type TrendingMetric = 'views' | 'likes' | 'copies' | 'comments' | 'rising';

/**
 * Get trending prompts by various metrics
 */
const getTrendingPromptsData = async ({
  metric = 'views',
  period = 'week',
  category,
  limit = 10,
  userId
}: {
  metric?: TrendingMetric;
  period?: TimePeriod;
  category?: string;
  limit?: number;
  userId?: string;
}) => {
  try {
    const periodConfig = TIME_PERIODS[period];
    const sinceDate = periodConfig.dateFilter();

    // Base where clause for published prompts
    const baseWhere = {
      isPublished: true,
      status: 'APPROVED' as const,
      ...(category && {
        prompt: {
          tags: {
            some: {
              name: category
            }
          }
        }
      })
    };

    let trendingPrompts: any[] = [];

    switch (metric) {
      case 'views': {
        // Get prompts with most views in the period - simplified query
        const sharedPrompts = await db.sharedPrompt.findMany({
          where: {
            isPublished: true,
            status: 'APPROVED',
            ...(category && {
              prompt: {
                tags: {
                  some: {
                    name: category
                  }
                }
              }
            })
          },
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
            views: {
              where: {
                viewedAt: { gte: sinceDate }
              },
              select: {
                id: true
              }
            }
          },
          orderBy: {
            viewCount: 'desc'
          },
          take: limit
        });

        trendingPrompts = sharedPrompts.map(prompt => ({
          ...prompt,
          periodMetricCount: prompt.views.length,
          metricLabel: 'views',
          views: undefined // Remove the views array from the result
        }));
        break;
      }

      case 'likes': {
        // Get prompts with most likes in the period - simplified
        const sharedPrompts = await db.sharedPrompt.findMany({
          where: {
            isPublished: true,
            status: 'APPROVED',
            ...(category && {
              prompt: {
                tags: {
                  some: {
                    name: category
                  }
                }
              }
            })
          },
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
                tags: true,
                likes: {
                  where: {
                    createdAt: { gte: sinceDate }
                  },
                  select: {
                    id: true
                  }
                }
              }
            }
          },
          orderBy: {
            likeCount: 'desc'
          },
          take: limit
        });

        trendingPrompts = sharedPrompts.map(prompt => ({
          ...prompt,
          periodMetricCount: prompt.prompt.likes.length,
          metricLabel: 'likes',
          prompt: {
            ...prompt.prompt,
            likes: undefined // Remove the likes array
          }
        }));
        break;
      }

      case 'copies': {
        // Get prompts with most copies in the period - simplified
        const sharedPrompts = await db.sharedPrompt.findMany({
          where: {
            isPublished: true,
            status: 'APPROVED',
            ...(category && {
              prompt: {
                tags: {
                  some: {
                    name: category
                  }
                }
              }
            })
          },
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
            copies: {
              where: {
                copiedAt: { gte: sinceDate }
              },
              select: {
                id: true
              }
            }
          },
          orderBy: {
            copyCount: 'desc'
          },
          take: limit
        });

        trendingPrompts = sharedPrompts.map(prompt => ({
          ...prompt,
          periodMetricCount: prompt.copies.length,
          metricLabel: 'copies',
          copies: undefined // Remove the copies array
        }));
        break;
      }

      case 'comments': {
        // Get prompts with most comments in the period - simplified
        const sharedPrompts = await db.sharedPrompt.findMany({
          where: {
            isPublished: true,
            status: 'APPROVED',
            ...(category && {
              prompt: {
                tags: {
                  some: {
                    name: category
                  }
                }
              }
            })
          },
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
            comments: {
              where: {
                createdAt: { gte: sinceDate }
              },
              select: {
                id: true
              }
            }
          },
          orderBy: {
            commentCount: 'desc'
          },
          take: limit
        });

        trendingPrompts = sharedPrompts.map(prompt => ({
          ...prompt,
          periodMetricCount: prompt.comments.length,
          metricLabel: 'comments',
          comments: undefined // Remove the comments array
        }));
        break;
      }

      case 'rising': {
        // For rising/trending, we'll look at recently published prompts with high engagement
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - (period === 'today' ? 1 : period === 'week' ? 3 : 7));

        const sharedPrompts = await db.sharedPrompt.findMany({
          where: {
            isPublished: true,
            status: 'APPROVED',
            publishedAt: { gte: recentDate }, // Recently published
            ...(category && {
              prompt: {
                tags: {
                  some: {
                    name: category
                  }
                }
              }
            })
          },
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
            }
          },
          orderBy: [
            { viewCount: 'desc' },
            { likeCount: 'desc' }
          ],
          take: limit
        });

        // Calculate engagement rate (likes + comments per view)
        trendingPrompts = sharedPrompts.map(prompt => {
          const engagementRate = prompt.viewCount > 0 
            ? ((prompt.likeCount + prompt.commentCount) / prompt.viewCount) * 100
            : 0;
          
          return {
            ...prompt,
            periodMetricCount: Math.round(engagementRate),
            metricLabel: '% engagement'
          };
        });

        // Sort by engagement rate
        trendingPrompts.sort((a, b) => b.periodMetricCount - a.periodMetricCount);
        break;
      }

      default:
        trendingPrompts = [];
    }

    // Add isLiked status if user is logged in
    if (userId && trendingPrompts.length > 0) {
      const promptIds = trendingPrompts.map(p => p.promptId);
      const likedPrompts = await db.promptLike.findMany({
        where: {
          userId: userId,
          promptId: { in: promptIds }
        }
      });

      const likedSet = new Set(likedPrompts.map(like => like.promptId));

      trendingPrompts = trendingPrompts.map(prompt => ({
        ...prompt,
        isLiked: likedSet.has(prompt.promptId)
      }));
    }

    return {
      success: true,
      prompts: trendingPrompts,
      period: periodConfig.label,
      metric
    };

  } catch (error) {
    console.error('Error getting trending prompts:', error);
    return { success: false, error: 'Failed to load trending prompts' };
  }
};

// Create cached version with userId in the key
const getCachedTrendingPrompts = (params: {
  metric?: TrendingMetric;
  period?: TimePeriod;
  category?: string;
  limit?: number;
  userId?: string;
}) => {
  return unstable_cache(
    async () => getTrendingPromptsData(params),
    ['trending-prompts', params.metric || 'views', params.period || 'week', params.category || 'all', params.userId || 'anonymous'],
    {
      revalidate: 300, // 5 minutes
      tags: ['trending', 'prompts']
    }
  )();
};

// Public function that gets session and calls cached function
export async function getTrendingPrompts(params: {
  metric?: TrendingMetric;
  period?: TimePeriod;
  category?: string;
  limit?: number;
}) {
  const session = await getServerSession(authOptions);
  return getCachedTrendingPrompts({
    ...params,
    userId: session?.user?.id
  });
}

/**
 * Get trending statistics for dashboard charts
 */
export async function getTrendingStats({
  userId,
  period = 'week'
}: {
  userId?: string;
  period?: TimePeriod;
}) {
  try {
    const periodConfig = TIME_PERIODS[period];
    const sinceDate = periodConfig.dateFilter();

    // Build base query
    const baseQuery = userId ? { userId } : {};

    // Get engagement stats over time
    const [viewsByDay, likesByDay, copiesByDay] = await Promise.all([
      // Views by day
      userId
        ? db.$queryRaw<Array<{ date: Date; count: bigint }>>`
            SELECT DATE("viewedAt") as date, COUNT(*) as count
            FROM "PromptView"
            WHERE "viewedAt" >= ${sinceDate}
            AND "userId" = ${userId}
            GROUP BY DATE("viewedAt")
            ORDER BY date
          `
        : db.$queryRaw<Array<{ date: Date; count: bigint }>>`
            SELECT DATE("viewedAt") as date, COUNT(*) as count
            FROM "PromptView"
            WHERE "viewedAt" >= ${sinceDate}
            GROUP BY DATE("viewedAt")
            ORDER BY date
          `,
      
      // Likes by day
      userId
        ? db.$queryRaw<Array<{ date: Date; count: bigint }>>`
            SELECT DATE("createdAt") as date, COUNT(*) as count
            FROM "PromptLike"
            WHERE "createdAt" >= ${sinceDate}
            AND "userId" = ${userId}
            GROUP BY DATE("createdAt")
            ORDER BY date
          `
        : db.$queryRaw<Array<{ date: Date; count: bigint }>>`
            SELECT DATE("createdAt") as date, COUNT(*) as count
            FROM "PromptLike"
            WHERE "createdAt" >= ${sinceDate}
            GROUP BY DATE("createdAt")
            ORDER BY date
          `,
      
      // Copies by day
      userId
        ? db.$queryRaw<Array<{ date: Date; count: bigint }>>`
            SELECT DATE("copiedAt") as date, COUNT(*) as count
            FROM "PromptCopy"
            WHERE "copiedAt" >= ${sinceDate}
            AND "userId" = ${userId}
            GROUP BY DATE("copiedAt")
            ORDER BY date
          `
        : db.$queryRaw<Array<{ date: Date; count: bigint }>>`
            SELECT DATE("copiedAt") as date, COUNT(*) as count
            FROM "PromptCopy"
            WHERE "copiedAt" >= ${sinceDate}
            GROUP BY DATE("copiedAt")
            ORDER BY date
          `
    ]);

    // Get category breakdown
    const categoryStats = await db.tag.findMany({
      select: {
        name: true,
        prompts: {
          where: {
            ...(userId && { userId }),
            sharedPrompt: {
              isPublished: true,
              status: 'APPROVED',
              publishedAt: { gte: sinceDate }
            }
          },
          select: {
            id: true,
            sharedPrompt: {
              select: {
                viewCount: true,
                likeCount: true,
                copyCount: true
              }
            }
          }
        }
      }
    });

    // Process category data
    const categoryData = categoryStats
      .map(cat => ({
        name: cat.name,
        promptCount: cat.prompts.length,
        totalViews: cat.prompts.reduce((sum, p) => sum + (p.sharedPrompt?.viewCount || 0), 0),
        totalLikes: cat.prompts.reduce((sum, p) => sum + (p.sharedPrompt?.likeCount || 0), 0),
        totalCopies: cat.prompts.reduce((sum, p) => sum + (p.sharedPrompt?.copyCount || 0), 0)
      }))
      .filter(cat => cat.promptCount > 0)
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 10);

    return {
      success: true,
      stats: {
        viewsByDay: viewsByDay.map(v => ({ date: v.date, count: Number(v.count) })),
        likesByDay: likesByDay.map(l => ({ date: l.date, count: Number(l.count) })),
        copiesByDay: copiesByDay.map(c => ({ date: c.date, count: Number(c.count) })),
        categoryData
      }
    };

  } catch (error) {
    console.error('Error getting trending stats:', error);
    return { success: false, error: 'Failed to load trending statistics' };
  }
}

/**
 * Get available categories for filtering
 */
export async function getTrendingCategories() {
  try {
    const categories = await db.tag.findMany({
      where: {
        prompts: {
          some: {
            sharedPrompt: {
              isPublished: true,
              status: 'APPROVED'
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            prompts: {
              where: {
                sharedPrompt: {
                  isPublished: true,
                  status: 'APPROVED'
                }
              }
            }
          }
        }
      },
      orderBy: {
        prompts: {
          _count: 'desc'
        }
      },
      take: 20
    });

    return {
      success: true,
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        count: cat._count.prompts
      }))
    };

  } catch (error) {
    console.error('Error getting trending categories:', error);
    return { success: false, error: 'Failed to load categories' };
  }
}