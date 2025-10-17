'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

/**
 * Toggle like for a prompt
 */
export async function togglePromptLike(promptId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    // Check if user already liked this prompt
    const existingLike = await db.promptLike.findUnique({
      where: {
        promptId_userId: {
          promptId,
          userId: session.user.id
        }
      }
    });

    if (existingLike) {
      // Unlike the prompt
      await db.promptLike.delete({
        where: {
          id: existingLike.id
        }
      });

      // Update like count on shared prompt if it exists
      const sharedPrompt = await db.sharedPrompt.findFirst({
        where: { promptId }
      });

      if (sharedPrompt) {
        await db.sharedPrompt.update({
          where: { id: sharedPrompt.id },
          data: {
            likeCount: {
              decrement: 1
            }
          }
        });

        // Remove reputation from author
        await updateUserReputation(sharedPrompt.authorId, 'PROMPT_LIKED', -2);
      }

      revalidatePath('/shared-prompts');
      return { success: true, isLiked: false, message: 'Prompt unliked' };

    } else {
      // Like the prompt
      await db.promptLike.create({
        data: {
          promptId,
          userId: session.user.id
        }
      });

      // Update like count on shared prompt if it exists
      const sharedPrompt = await db.sharedPrompt.findFirst({
        where: { promptId }
      });

      if (sharedPrompt) {
        await db.sharedPrompt.update({
          where: { id: sharedPrompt.id },
          data: {
            likeCount: {
              increment: 1
            }
          }
        });

        // Add reputation to author
        await updateUserReputation(sharedPrompt.authorId, 'PROMPT_LIKED', 2);
      }

      revalidatePath('/shared-prompts');
      return { success: true, isLiked: true, message: 'Prompt liked!' };
    }

  } catch (_error) {

    return { success: false, error: 'Failed to toggle like' };
  }
}

/**
 * Add a comment to a shared prompt
 */
export async function addPromptComment(sharedPromptId: string, content: string, parentId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    if (!content.trim()) {
      return { success: false, error: 'Comment content is required' };
    }

    // Verify the shared prompt exists and is published
    const sharedPrompt = await db.sharedPrompt.findUnique({
      where: { 
        id: sharedPromptId,
        isPublished: true,
        status: 'APPROVED'
      }
    });

    if (!sharedPrompt) {
      return { success: false, error: 'Shared prompt not found' };
    }

    // If this is a reply, verify the parent comment exists
    if (parentId) {
      const parentComment = await db.promptComment.findUnique({
        where: { 
          id: parentId,
          sharedPromptId // Ensure parent belongs to the same prompt
        }
      });

      if (!parentComment) {
        return { success: false, error: 'Parent comment not found' };
      }
    }

    // Create the comment
    const comment = await db.promptComment.create({
      data: {
        content: content.trim(),
        userId: session.user.id,
        sharedPromptId,
        parentId
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
      }
    });

    // Update comment count on shared prompt
    await db.sharedPrompt.update({
      where: { id: sharedPromptId },
      data: {
        commentCount: {
          increment: 1
        }
      }
    });

    // Add reputation to commenter
    await updateUserReputation(session.user.id, 'HELPFUL_COMMENT', 1);

    revalidatePath('/shared-prompts');
    revalidatePath(`/shared-prompts/${sharedPromptId}`);

    return { 
      success: true, 
      comment,
      message: parentId ? 'Reply added successfully!' : 'Comment added successfully!' 
    };

  } catch (_error) {

    return { success: false, error: 'Failed to add comment' };
  }
}

/**
 * Get comments for a shared prompt
 */
export async function getPromptComments(sharedPromptId: string) {
  try {
    const comments = await db.promptComment.findMany({
      where: {
        sharedPromptId,
        parentId: null // Only top-level comments
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
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return { success: true, comments };

  } catch (_error) {

    return { success: false, error: 'Failed to load comments' };
  }
}

/**
 * Delete a comment (only by author or admin)
 */
export async function deletePromptComment(commentId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    // Get the comment to verify ownership
    const comment = await db.promptComment.findUnique({
      where: { id: commentId },
      include: {
        sharedPrompt: true
      }
    });

    if (!comment) {
      return { success: false, error: 'Comment not found' };
    }

    // Check if user owns the comment or is the prompt author
    if (comment.userId !== session.user.id && comment.sharedPrompt.authorId !== session.user.id) {
      return { success: false, error: 'Permission denied' };
    }

    // Delete the comment and all its replies
    await db.promptComment.deleteMany({
      where: {
        OR: [
          { id: commentId },
          { parentId: commentId }
        ]
      }
    });

    // Update comment count (this is a rough estimate - could be improved)
    const remainingCommentsCount = await db.promptComment.count({
      where: { sharedPromptId: comment.sharedPromptId }
    });

    await db.sharedPrompt.update({
      where: { id: comment.sharedPromptId },
      data: {
        commentCount: remainingCommentsCount
      }
    });

    revalidatePath('/shared-prompts');
    revalidatePath(`/shared-prompts/${comment.sharedPromptId}`);

    return { success: true, message: 'Comment deleted successfully' };

  } catch (_error) {

    return { success: false, error: 'Failed to delete comment' };
  }
}

/**
 * Update a comment (only by author)
 */
export async function updatePromptComment(commentId: string, content: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    if (!content.trim()) {
      return { success: false, error: 'Comment content is required' };
    }

    // Get the comment to verify ownership
    const comment = await db.promptComment.findUnique({
      where: { id: commentId }
    });

    if (!comment) {
      return { success: false, error: 'Comment not found' };
    }

    if (comment.userId !== session.user.id) {
      return { success: false, error: 'Permission denied' };
    }

    // Update the comment
    const updatedComment = await db.promptComment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
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
        }
      }
    });

    revalidatePath('/shared-prompts');
    revalidatePath(`/shared-prompts/${comment.sharedPromptId}`);

    return { 
      success: true, 
      comment: updatedComment,
      message: 'Comment updated successfully' 
    };

  } catch (_error) {

    return { success: false, error: 'Failed to update comment' };
  }
}

/**
 * Get user's liked prompts
 */
export async function getUserLikedPrompts() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Authentication required' };
    }

    const likedPrompts = await db.promptLike.findMany({
      where: { userId: session.user.id },
      include: {
        prompt: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true
              }
            },
            tags: true,
            sharedPrompt: {
              select: {
                id: true,
                title: true,
                description: true,
                publishedAt: true,
                viewCount: true,
                likeCount: true,
                commentCount: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return { success: true, likedPrompts };

  } catch (_error) {

    return { success: false, error: 'Failed to load liked prompts' };
  }
}

/**
 * Update user reputation helper function
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
  } catch (_error) {

  }
}