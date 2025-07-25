'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { db } from '@/lib/db';
import { cache } from 'react';
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
const getTrendingPromptsData = cache(async ({
  metric = 'views',
  period = 'week',
  category,
  limit = 10
}: {
  metric?: TrendingMetric;
  period?: TimePeriod;
  category?: string;
  limit?: number;
}) => {
  try {
    const session = await getServerSession(authOptions);
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

    let trendingPrompts;

    switch (metric) {
      case 'views': {
        // Get prompts with most views in the period
        const promptViews = await db.promptView.groupBy({
          by: ['sharedPromptId'],
          where: {
            viewedAt: { gte: sinceDate },
            sharedPrompt: baseWhere
          },
          _count: {
            id: true
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          },
          take: limit
        });

        const promptIds = promptViews.map(pv => pv.sharedPromptId);
        
        trendingPrompts = await db.sharedPrompt.findMany({
          where: {
            id: { in: promptIds }
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
          }
        });

        // Sort by view count from groupBy result
        const viewCountMap = new Map(promptViews.map(pv => [pv.sharedPromptId, pv._count.id]));
        trendingPrompts.sort((a, b) => (viewCountMap.get(b.id) || 0) - (viewCountMap.get(a.id) || 0));
        
        // Add period view count to each prompt
        trendingPrompts = trendingPrompts.map(prompt => ({
          ...prompt,
          periodMetricCount: viewCountMap.get(prompt.id) || 0,
          metricLabel: 'views'
        }));
        break;
      }

      case 'likes': {
        // Get prompts with most likes in the period
        const promptLikes = await db.promptLike.groupBy({
          by: ['promptId'],
          where: {
            createdAt: { gte: sinceDate },
            prompt: {
              sharedPrompt: baseWhere
            }
          },
          _count: {
            id: true
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          },
          take: limit
        });

        const promptIds = promptLikes.map(pl => pl.promptId);
        
        const prompts = await db.prompt.findMany({
          where: {
            id: { in: promptIds }
          },
          include: {
            sharedPrompt: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    name: true,
                    avatarType: true,
                    profilePicture: true
                  }
                }
              }
            },
            tags: true
          }
        });

        // Transform to match SharedPrompt structure
        trendingPrompts = prompts
          .filter(p => p.sharedPrompt)
          .map(p => ({
            ...p.sharedPrompt!,
            prompt: {
              id: p.id,
              tags: p.tags
            },
            periodMetricCount: promptLikes.find(pl => pl.promptId === p.id)?._count.id || 0,
            metricLabel: 'likes'
          }));

        // Sort by like count
        trendingPrompts.sort((a, b) => b.periodMetricCount - a.periodMetricCount);
        break;
      }

      case 'copies': {
        // Get prompts with most copies in the period
        const promptCopies = await db.promptCopy.groupBy({
          by: ['sharedPromptId'],
          where: {
            copiedAt: { gte: sinceDate },
            sharedPrompt: baseWhere
          },
          _count: {
            id: true
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          },
          take: limit
        });

        const promptIds = promptCopies.map(pc => pc.sharedPromptId);
        
        trendingPrompts = await db.sharedPrompt.findMany({
          where: {
            id: { in: promptIds }
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
          }
        });

        // Sort by copy count
        const copyCountMap = new Map(promptCopies.map(pc => [pc.sharedPromptId, pc._count.id]));
        trendingPrompts.sort((a, b) => (copyCountMap.get(b.id) || 0) - (copyCountMap.get(a.id) || 0));
        
        trendingPrompts = trendingPrompts.map(prompt => ({
          ...prompt,
          periodMetricCount: copyCountMap.get(prompt.id) || 0,
          metricLabel: 'copies'
        }));
        break;
      }

      case 'comments': {
        // Get prompts with most comments in the period
        const promptComments = await db.promptComment.groupBy({
          by: ['sharedPromptId'],
          where: {
            createdAt: { gte: sinceDate },
            sharedPrompt: baseWhere
          },
          _count: {
            id: true
          },
          orderBy: {
            _count: {
              id: 'desc'
            }
          },
          take: limit
        });

        const promptIds = promptComments.map(pc => pc.sharedPromptId);
        
        trendingPrompts = await db.sharedPrompt.findMany({
          where: {
            id: { in: promptIds }
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
          }
        });

        // Sort by comment count
        const commentCountMap = new Map(promptComments.map(pc => [pc.sharedPromptId, pc._count.id]));
        trendingPrompts.sort((a, b) => (commentCountMap.get(b.id) || 0) - (commentCountMap.get(a.id) || 0));
        
        trendingPrompts = trendingPrompts.map(prompt => ({
          ...prompt,
          periodMetricCount: commentCountMap.get(prompt.id) || 0,
          metricLabel: 'comments'
        }));
        break;
      }

      case 'rising': {
        // Calculate velocity-based trending (engagement rate over time)
        // This is more complex as it requires comparing recent vs older engagement
        
        const midPoint = new Date();
        midPoint.setTime(sinceDate.getTime() + (Date.now() - sinceDate.getTime()) / 2);

        // Get engagement in first half of period
        const [oldViews, oldLikes] = await Promise.all([
          db.promptView.groupBy({
            by: ['sharedPromptId'],
            where: {
              viewedAt: { gte: sinceDate, lt: midPoint },
              sharedPrompt: baseWhere
            },
            _count: { id: true }
          }),
          db.promptLike.groupBy({
            by: ['promptId'],
            where: {
              createdAt: { gte: sinceDate, lt: midPoint },
              prompt: { sharedPrompt: baseWhere }
            },
            _count: { id: true }
          })
        ]);

        // Get engagement in second half of period
        const [newViews, newLikes] = await Promise.all([
          db.promptView.groupBy({
            by: ['sharedPromptId'],
            where: {
              viewedAt: { gte: midPoint },
              sharedPrompt: baseWhere
            },
            _count: { id: true }
          }),
          db.promptLike.groupBy({
            by: ['promptId'],
            where: {
              createdAt: { gte: midPoint },
              prompt: { sharedPrompt: baseWhere }
            },
            _count: { id: true }
          })
        ]);

        // Calculate velocity scores
        const velocityScores = new Map<string, number>();
        
        // Process views
        const oldViewsMap = new Map(oldViews.map(v => [v.sharedPromptId, v._count.id]));
        newViews.forEach(v => {
          const oldCount = oldViewsMap.get(v.sharedPromptId) || 0;
          const newCount = v._count.id;
          const velocity = oldCount > 0 ? (newCount - oldCount) / oldCount : newCount;
          velocityScores.set(v.sharedPromptId, velocity);
        });

        // Get top rising prompts
        const risingPromptIds = Array.from(velocityScores.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([id]) => id);

        trendingPrompts = await db.sharedPrompt.findMany({
          where: {
            id: { in: risingPromptIds }
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
          }
        });

        // Sort by velocity score
        trendingPrompts.sort((a, b) => 
          (velocityScores.get(b.id) || 0) - (velocityScores.get(a.id) || 0)
        );
        
        trendingPrompts = trendingPrompts.map(prompt => ({
          ...prompt,
          periodMetricCount: Math.round((velocityScores.get(prompt.id) || 0) * 100),
          metricLabel: '% growth'
        }));
        break;
      }

      default:
        trendingPrompts = [];
    }

    // Add isLiked status if user is logged in
    if (session?.user?.id && trendingPrompts.length > 0) {
      const promptIds = trendingPrompts.map(p => p.promptId);
      const likedPrompts = await db.promptLike.findMany({
        where: {
          userId: session.user.id,
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
});

// Create cached version
export const getTrendingPrompts = unstable_cache(
  getTrendingPromptsData,
  ['trending-prompts'],
  {
    revalidate: 300, // 5 minutes
    tags: ['trending', 'prompts']
  }
);

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
      db.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE(viewed_at) as date, COUNT(*) as count
        FROM prompt_views
        WHERE viewed_at >= ${sinceDate}
        ${userId ? db.$queryRaw`AND user_id = ${userId}` : db.$queryRaw``}
        GROUP BY DATE(viewed_at)
        ORDER BY date
      `,
      
      // Likes by day
      db.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM prompt_likes
        WHERE created_at >= ${sinceDate}
        ${userId ? db.$queryRaw`AND user_id = ${userId}` : db.$queryRaw``}
        GROUP BY DATE(created_at)
        ORDER BY date
      `,
      
      // Copies by day
      db.$queryRaw<Array<{ date: Date; count: bigint }>>`
        SELECT DATE(copied_at) as date, COUNT(*) as count
        FROM prompt_copies
        WHERE copied_at >= ${sinceDate}
        ${userId ? db.$queryRaw`AND user_id = ${userId}` : db.$queryRaw``}
        GROUP BY DATE(copied_at)
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