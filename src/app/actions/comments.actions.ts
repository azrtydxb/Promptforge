'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { fullModerationCheck } from '@/lib/moderation';
import { z } from 'zod';
import { Prisma } from "@/generated/prisma";
import { withPerformance } from "@/lib/performance-wrapper";

// Input validation schemas
const createCommentSchema = z.object({
  sharedPromptId: z.string().min(1),
  content: z.string().min(1).max(2000),
  parentId: z.string().optional()
});

const updateCommentSchema = z.object({
  commentId: z.string().min(1),
  content: z.string().min(1).max(2000)
});

/**
 * Create a new comment on a shared prompt
 */
export const createComment = withPerformance('createComment', async (data: z.infer<typeof createCommentSchema>) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    // Validate input
    const validated = createCommentSchema.parse(data);

    // Check if shared prompt exists and is published
    const sharedPrompt = await db.sharedPrompt.findFirst({
      where: {
        id: validated.sharedPromptId,
        isPublished: true,
        status: 'APPROVED'
      }
    });

    if (!sharedPrompt) {
      return { success: false, error: 'Shared prompt not found' };
    }

    // If replying to a comment, check parent exists
    if (validated.parentId) {
      const parentComment = await db.promptComment.findUnique({
        where: { id: validated.parentId }
      });

      if (!parentComment || parentComment.sharedPromptId !== validated.sharedPromptId) {
        return { success: false, error: 'Invalid parent comment' };
      }
    }

    // Moderate the content
    const moderationResult = await fullModerationCheck({
      content: validated.content
    });

    if (!moderationResult.isApproved) {
      return { 
        success: false, 
        error: `Comment rejected: ${moderationResult.moderationResult.reason}` 
      };
    }

    // Create the comment
    const comment = await db.promptComment.create({
      data: {
        content: validated.content,
        userId: session.user.id,
        sharedPromptId: validated.sharedPromptId,
        parentId: validated.parentId
      },
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
        _count: {
          select: {
            replies: true
          }
        }
      }
    });

    // Update comment count on shared prompt
    await db.sharedPrompt.update({
      where: { id: validated.sharedPromptId },
      data: {
        commentCount: {
          increment: 1
        }
      }
    });

    // Update user reputation for comment
    await updateUserReputation(session.user.id, 'COMMENT', 2);

    // TODO: Create notification for prompt author or parent comment author
    // This would be implemented with a notification system

    revalidatePath(`/shared-prompts/${validated.sharedPromptId}`);

    return {
      success: true,
      comment: {
        ...comment,
        isLiked: false,
        canEdit: true,
        canDelete: true
      }
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input data' };
    }
    console.error('Error creating comment:', error);
    return { success: false, error: 'Failed to create comment' };
  }
});

/**
 * Update an existing comment
 */
export async function updateComment(data: z.infer<typeof updateCommentSchema>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    // Validate input
    const validated = updateCommentSchema.parse(data);

    // Check if comment exists and user owns it
    const existingComment = await db.promptComment.findUnique({
      where: { id: validated.commentId }
    });

    if (!existingComment) {
      return { success: false, error: 'Comment not found' };
    }

    if (existingComment.userId !== session.user.id) {
      return { success: false, error: 'Unauthorized to edit this comment' };
    }

    // Check if comment was created within last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (existingComment.createdAt < fifteenMinutesAgo) {
      return { success: false, error: 'Comments can only be edited within 15 minutes of creation' };
    }

    // Moderate the new content
    const moderationResult = await fullModerationCheck({
      content: validated.content
    });

    if (!moderationResult.isApproved) {
      return { 
        success: false, 
        error: `Comment rejected: ${moderationResult.moderationResult.reason}` 
      };
    }

    // Update the comment
    const updatedComment = await db.promptComment.update({
      where: { id: validated.commentId },
      data: {
        content: validated.content,
        updatedAt: new Date()
      },
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
        _count: {
          select: {
            replies: true
          }
        }
      }
    });

    revalidatePath(`/shared-prompts/${existingComment.sharedPromptId}`);

    return { 
      success: true, 
      comment: {
        ...updatedComment,
        isLiked: false,
        likeCount: 0,
        canEdit: true,
        canDelete: true
      }
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input data' };
    }
    console.error('Error updating comment:', error);
    return { success: false, error: 'Failed to update comment' };
  }
}

/**
 * Delete a comment
 */
export const deleteComment = withPerformance('deleteComment', async (commentId: string) => {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    // Check if comment exists
    const comment = await db.promptComment.findUnique({
      where: { id: commentId },
      include: {
        sharedPrompt: {
          select: {
            authorId: true
          }
        }
      }
    });

    if (!comment) {
      return { success: false, error: 'Comment not found' };
    }

    // Check if user can delete (owns comment or is prompt author)
    const canDelete = comment.userId === session.user.id || 
                     comment.sharedPrompt.authorId === session.user.id;

    if (!canDelete) {
      return { success: false, error: 'Unauthorized to delete this comment' };
    }

    // Delete the comment (cascades to replies)
    await db.promptComment.delete({
      where: { id: commentId }
    });

    // Update comment count on shared prompt
    await db.sharedPrompt.update({
      where: { id: comment.sharedPromptId },
      data: {
        commentCount: {
          decrement: 1
        }
      }
    });

    revalidatePath(`/shared-prompts/${comment.sharedPromptId}`);

    return { success: true, message: 'Comment deleted successfully' };

  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false, error: 'Failed to delete comment' };
  }
});

/**
 * Toggle like on a comment
 */
export async function toggleCommentLike(commentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    // Check if comment exists
    const comment = await db.promptComment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return { success: false, error: 'Comment not found' };
    }

    // Check if already liked
    const existingLike = await db.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId: session.user.id
        }
      }
    });

    let isLiked = false;
    let likeCount = comment.likeCount;

    if (existingLike) {
      // Unlike
      await db.commentLike.delete({
        where: {
          commentId_userId: {
            commentId,
            userId: session.user.id
          }
        }
      });
      likeCount--;
    } else {
      // Like
      await db.commentLike.create({
        data: {
          commentId,
          userId: session.user.id
        }
      });
      isLiked = true;
      likeCount++;

      // Give reputation to comment author
      if (comment.userId !== session.user.id) {
        await updateUserReputation(comment.userId, 'COMMENT_LIKED', 1);
      }
    }

    // Update like count on comment
    await db.promptComment.update({
      where: { id: commentId },
      data: { likeCount }
    });

    revalidatePath(`/shared-prompts/${comment.sharedPromptId}`);

    return { success: true, isLiked, likeCount };

  } catch (error) {
    console.error('Error toggling comment like:', error);
    return { success: false, error: 'Failed to toggle like' };
  }
}

/**
 * Get comments for a shared prompt with pagination
 */
export const getComments = withPerformance('getComments', async ({
  sharedPromptId,
  page = 1,
  limit = 20,
  sortBy = 'newest'
}: {
  sharedPromptId: string;
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'oldest' | 'mostLiked';
}) => {
  try {
    const session = await getServerSession(authOptions);
    const skip = (page - 1) * limit;

    // Build order by clause
    let orderBy: Prisma.PromptCommentOrderByWithRelationInput = { createdAt: 'desc' }; // default: newest
    
    switch (sortBy) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'mostLiked':
        // Since we don't have likeCount, sort by createdAt
        orderBy = { createdAt: 'desc' };
        break;
    }

    // Get top-level comments
    const [comments, total] = await Promise.all([
      db.promptComment.findMany({
        where: {
          sharedPromptId,
          parentId: null
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatarType: true,
              profilePicture: true,
              reputationScore: true
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
                  profilePicture: true,
                  reputationScore: true
                }
              },
              likes: session?.user?.id ? {
                where: {
                  userId: session.user.id
                }
              } : false,
              _count: {
                select: {
                  replies: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          likes: session?.user?.id ? {
            where: {
              userId: session.user.id
            }
          } : false,
          _count: {
            select: {
              replies: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      db.promptComment.count({
        where: {
          sharedPromptId,
          parentId: null
        }
      })
    ]);

    // Get shared prompt author ID for moderation check
    const sharedPrompt = await db.sharedPrompt.findUnique({
      where: { id: sharedPromptId },
      select: { authorId: true }
    });

    // Format comments with user permissions
    const formattedComments = comments.map(comment => ({
      ...comment,
      isLiked: Array.isArray(comment.likes) ? comment.likes.length > 0 : false,
      canEdit: session?.user?.id === comment.userId,
      canDelete: session?.user?.id === comment.userId ||
                 session?.user?.id === sharedPrompt?.authorId,
      replies: comment.replies.map((reply) => ({
        ...reply,
        isLiked: Array.isArray(reply.likes) ? reply.likes.length > 0 : false,
        canEdit: session?.user?.id === reply.userId,
        canDelete: session?.user?.id === reply.userId ||
                   session?.user?.id === sharedPrompt?.authorId
      }))
    }));

    return {
      success: true,
      comments: formattedComments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };

  } catch (error) {
    console.error('Error getting comments:', error);
    return { success: false, error: 'Failed to load comments' };
  }
});

/**
 * Update user reputation for comment actions
 */
async function updateUserReputation(
  userId: string, 
  action: 'COMMENT' | 'COMMENT_LIKED',
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
  } catch (error) {
    console.error('Error updating user reputation:', error);
  }
}