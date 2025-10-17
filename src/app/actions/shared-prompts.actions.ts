'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { fullModerationCheck, initializeModerationRules } from '@/lib/moderation';
import {
  PromptVisibility,
  ModerationStatus,
  Prisma
} from '@/generated/prisma';

interface PublishPromptData {
  promptId: string;
  title?: string;
  description?: string;
  visibility?: PromptVisibility;
}


/**
 * Publish a prompt to the marketplace
 */
export async function publishPromptToMarketplace(data: PublishPromptData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    // Get the original prompt
    const prompt = await db.prompt.findUnique({
      where: { 
        id: data.promptId,
        userId: session.user.id // Ensure ownership
      },
      include: {
        tags: true
      }
    });

    if (!prompt) {
      return { success: false, error: 'Prompt not found or access denied' };
    }

    // Check if already published
    const existingSharedPrompt = await db.sharedPrompt.findFirst({
      where: { promptId: data.promptId }
    });

    if (existingSharedPrompt) {
      return { success: false, error: 'Prompt is already published to marketplace' };
    }

    // Moderate the content
    const moderationResult = await fullModerationCheck({
      title: data.title || prompt.title,
      content: prompt.content || '',
      description: data.description || prompt.description || ''
    });

    let status: ModerationStatus = 'PENDING';
    if (moderationResult.isApproved) {
      status = 'APPROVED';
    } else if (moderationResult.moderationResult.action === 'REJECT') {
      return { 
        success: false, 
        error: `Content rejected: ${moderationResult.moderationResult.reason}` 
      };
    }

    // Create shared prompt
    const sharedPrompt = await db.sharedPrompt.create({
      data: {
        promptId: prompt.id,
        authorId: session.user.id,
        title: data.title || prompt.title,
        description: data.description || prompt.description,
        content: prompt.content || '',
        visibility: data.visibility || 'PUBLIC',
        status,
        isPublished: status === 'APPROVED',
        publishedAt: status === 'APPROVED' ? new Date() : null
      }
    });

    // Update user reputation
    if (status === 'APPROVED') {
      await updateUserReputation(session.user.id, 'PUBLISH_PROMPT', 10);
    }

    revalidatePath('/shared-prompts');
    revalidatePath('/prompts');

    return { 
      success: true, 
      sharedPromptId: sharedPrompt.id,
      status,
      message: status === 'APPROVED' ? 'Prompt published successfully!' : 'Prompt submitted for review'
    };

  } catch (_error) {

    return { success: false, error: 'Failed to publish prompt' };
  }
}

/**
 * Get shared prompts with filtering and pagination
 */
export async function getSharedPrompts({
  page = 1,
  limit = 12,
  search = '',
  tags = [],
  sortBy = 'recent',
  authorId,
}: {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string[];
  sortBy?: 'recent' | 'popular' | 'liked' | 'copied';
  authorId?: string;
} = {}) {
  try {
    const session = await getServerSession(authOptions);
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
    let orderBy: Prisma.SharedPromptOrderByWithRelationInput = { publishedAt: 'desc' }; // default: recent

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

    // Check if user has liked these prompts
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
}

/**
 * Get available tags from published shared prompts with counts
 * OPTIMIZED: Uses raw SQL with JOINs to leverage database indexes and avoid N+1 queries
 * Performance improvement: ~32s → <1s by eliminating sequential scans
 */
export async function getAvailableSharedPromptTags() {
  try {
    // Use raw SQL with efficient JOINs and GROUP BY to leverage database indexes
    // This query uses:
    // - _PromptToTag_B_index for the Tag → PromptToTag join
    // - _PromptToTag_AB_pkey for the PromptToTag → Prompt join
    // - SharedPrompt_status_publishedAt_idx for filtering published prompts
    const result = await db.$queryRaw<Array<{ id: string; name: string; count: bigint }>>`
      SELECT
        t.id,
        t.name,
        COUNT(DISTINCT pt."A") as count
      FROM "Tag" t
      INNER JOIN "_PromptToTag" pt ON t.id = pt."B"
      INNER JOIN "Prompt" p ON pt."A" = p.id
      INNER JOIN "SharedPrompt" sp ON p.id = sp."promptId"
      WHERE sp."isPublished" = true AND sp.status = 'APPROVED'
      GROUP BY t.id, t.name
      ORDER BY count DESC
    `;

    // Convert BigInt count to number for JSON serialization
    const formattedTags = result.map(tag => ({
      id: tag.id,
      name: tag.name,
      count: Number(tag.count)
    }));

    return {
      success: true,
      tags: formattedTags
    };

  } catch (_error) {

    return { success: false, error: 'Failed to load tags', tags: [] };
  }
}

/**
 * Get a single shared prompt with details
 */
export async function getSharedPrompt(id: string) {
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
        },
        _count: {
          select: {
            comments: true,
            views: true,
            copies: true
          }
        }
      }
    });

    if (!sharedPrompt) {
      return { success: false, error: 'Shared prompt not found' };
    }

    // Record view if user is logged in
    if (session?.user?.id) {
      await recordPromptView(id, session.user.id);
      
      // Check if user has liked this prompt
      const like = await db.promptLike.findUnique({
        where: {
          promptId_userId: {
            promptId: sharedPrompt.promptId,
            userId: session.user.id
          }
        }
      });

      return {
        success: true,
        sharedPrompt: {
          ...sharedPrompt,
          isLiked: !!like
        }
      };
    }

    return { success: true, sharedPrompt };

  } catch (_error) {

    return { success: false, error: 'Failed to load shared prompt' };
  }
}

/**
 * Copy a shared prompt to user's personal library
 */
export async function copySharedPrompt(sharedPromptId: string, folderId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    // Get the shared prompt
    const sharedPrompt = await db.sharedPrompt.findUnique({
      where: {
        id: sharedPromptId,
        isPublished: true,
        status: 'APPROVED'
      },
      include: {
        prompt: {
          include: {
            tags: true
          }
        }
      }
    });

    if (!sharedPrompt) {
      return { success: false, error: 'Shared prompt not found' };
    }

    // Check if user already copied this prompt
    const existingCopy = await db.promptCopy.findUnique({
      where: {
        userId_sharedPromptId: {
          userId: session.user.id,
          sharedPromptId
        }
      }
    });

    // Create the copy in user's library
    const copiedPrompt = await db.prompt.create({
      data: {
        title: `${sharedPrompt.title} (Copy)`,
        description: sharedPrompt.description,
        content: sharedPrompt.content,
        userId: session.user.id,
        folderId,
        tags: {
          connect: sharedPrompt.prompt.tags.map(tag => ({ id: tag.id }))
        }
      }
    });

    // Record the copy action if not already recorded
    if (!existingCopy) {
      await db.promptCopy.create({
        data: {
          userId: session.user.id,
          sharedPromptId
        }
      });

      // Update copy count
      await db.sharedPrompt.update({
        where: { id: sharedPromptId },
        data: {
          copyCount: {
            increment: 1
          }
        }
      });

      // Update author's reputation
      await updateUserReputation(sharedPrompt.authorId, 'PROMPT_COPIED', 5);
    }

    revalidatePath('/prompts');

    return { 
      success: true, 
      promptId: copiedPrompt.id,
      message: 'Prompt copied to your library successfully!'
    };

  } catch (_error) {

    return { success: false, error: 'Failed to copy prompt' };
  }
}

/**
 * Record a view for analytics
 */
async function recordPromptView(sharedPromptId: string, userId?: string) {
  try {
    // Check if user already viewed this recently (within last hour)
    if (userId) {
      const recentView = await db.promptView.findFirst({
        where: {
          sharedPromptId,
          userId,
          viewedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
          }
        }
      });

      if (recentView) return; // Don't record duplicate views
    }

    // Record the view
    await db.promptView.create({
      data: {
        sharedPromptId,
        userId
      }
    });

    // Update view count
    await db.sharedPrompt.update({
      where: { id: sharedPromptId },
      data: {
        viewCount: {
          increment: 1
        }
      }
    });

  } catch (_error) {

  }
}

/**
 * Update user reputation
 */
async function updateUserReputation(
  userId: string, 
  action: 'PUBLISH_PROMPT' | 'PROMPT_LIKED' | 'PROMPT_COPIED' | 'HELPFUL_COMMENT',
  points: number
) {
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        reputationScore: {
          increment: points
        }
      }
    });

    // Check for badge milestones
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { reputationScore: true }
    });

    if (user) {
      await checkAndAwardBadges(userId, user.reputationScore);
    }

  } catch (_error) {

  }
}

/**
 * Check and award badges based on reputation milestones
 */
async function checkAndAwardBadges(userId: string, reputationScore: number) {
  try {
    const badges = [];

    if (reputationScore >= 100) {
      badges.push({
        type: 'CREATOR' as const,
        title: 'Creator',
        description: 'Earned 100+ reputation points'
      });
    }

    if (reputationScore >= 500) {
      badges.push({
        type: 'POPULAR' as const,
        title: 'Popular Creator',
        description: 'Earned 500+ reputation points'
      });
    }

    if (reputationScore >= 1000) {
      badges.push({
        type: 'HELPFUL' as const,
        title: 'Community Helper',
        description: 'Earned 1000+ reputation points'
      });
    }

    // Award badges that user doesn't already have
    for (const badge of badges) {
      await db.userBadge.upsert({
        where: {
          userId_type: {
            userId,
            type: badge.type
          }
        },
        update: {},
        create: {
          userId,
          type: badge.type,
          title: badge.title,
          description: badge.description
        }
      });
    }

  } catch (_error) {

  }
}

/**
 * Initialize the marketplace (create default moderation rules)
 */
export async function initializeMarketplace() {
  try {
    await initializeModerationRules();
    return { success: true };
  } catch (_error) {

    return { success: false, error: 'Failed to initialize marketplace' };
  }
}