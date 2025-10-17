"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { PerformanceMonitor } from "@/lib/performance";
import { withActionValidation } from "@/lib/validation-middleware";
import { promptSchemas, CreatePromptInput, UpdatePromptInput } from "@/lib/schemas";
import { cacheInvalidationV2 } from "@/lib/cache-invalidation-v2";

// Optimized query with proper select to avoid N+1 issues
export async function getPromptsByFolder(folderId?: string) {
  const user = await requireAuth();
  
  return PerformanceMonitor.measureQuery('getPromptsByFolder', async () => {
    const prompts = await db.prompt.findMany({
      where: {
        userId: user.id,
        folderId: folderId || null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        pinnedAt: true,
        order: true,
        createdAt: true,
        updatedAt: true,
        folderId: true,
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          }
        },
        _count: {
          select: {
            likes: true,
            favorites: true,
          },
        },
      },
      orderBy: [
        { pinnedAt: { sort: 'desc', nulls: 'last' } },
        { order: "asc" },
      ],
    });

    // Get like and favorite status in a single query
    const promptIds = prompts.map(p => p.id);
    const [likes, favorites] = await Promise.all([
      promptIds.length > 0 ? db.promptLike.findMany({
        where: {
          promptId: { in: promptIds },
          userId: user.id,
        },
        select: { promptId: true }
      }) : [],
      promptIds.length > 0 ? db.promptFavorite.findMany({
        where: {
          promptId: { in: promptIds },
          userId: user.id,
        },
        select: { promptId: true }
      }) : []
    ]);

    const likedPromptIds = new Set(likes.map(l => l.promptId));
    const favoritedPromptIds = new Set(favorites.map(f => f.promptId));

    // Add computed fields
    return prompts.map(prompt => ({
      ...prompt,
      likeCount: prompt._count.likes,
      favoriteCount: prompt._count.favorites,
      isLikedByUser: likedPromptIds.has(prompt.id),
      isFavoritedByUser: favoritedPromptIds.has(prompt.id),
      isPinned: !!prompt.pinnedAt,
    }));
  });
}

export async function getAllPrompts() {
  const user = await requireAuth();
  
  return PerformanceMonitor.measureQuery('getAllPrompts', async () => {
    const prompts = await db.prompt.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        pinnedAt: true,
        order: true,
        createdAt: true,
        updatedAt: true,
        folderId: true,
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          }
        },
        _count: {
          select: {
            likes: true,
            favorites: true,
          },
        },
      },
      orderBy: [
        { pinnedAt: { sort: 'desc', nulls: 'last' } },
        { updatedAt: "desc" },
      ],
    });

    // Get like and favorite status in a single query
    const promptIds = prompts.map(p => p.id);
    const [likes, favorites] = await Promise.all([
      promptIds.length > 0 ? db.promptLike.findMany({
        where: {
          promptId: { in: promptIds },
          userId: user.id,
        },
        select: { promptId: true }
      }) : [],
      promptIds.length > 0 ? db.promptFavorite.findMany({
        where: {
          promptId: { in: promptIds },
          userId: user.id,
        },
        select: { promptId: true }
      }) : []
    ]);

    const likedPromptIds = new Set(likes.map(l => l.promptId));
    const favoritedPromptIds = new Set(favorites.map(f => f.promptId));

    // Add computed fields
    return prompts.map(prompt => ({
      ...prompt,
      likeCount: prompt._count.likes,
      favoriteCount: prompt._count.favorites,
      isLikedByUser: likedPromptIds.has(prompt.id),
      isFavoritedByUser: favoritedPromptIds.has(prompt.id),
      isPinned: !!prompt.pinnedAt,
    }));
  });
}

// Optimized create prompt with validation
export const createPrompt = withActionValidation(
  promptSchemas.create,
  async (data: CreatePromptInput) => {
    const user = await requireAuth();
    
    return PerformanceMonitor.measureQuery('createPrompt', async () => {
      const prompt = await db.prompt.create({
        data: {
          ...data,
          userId: user.id,
        },
        select: {
          id: true,
          title: true,
          description: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          tags: {
            select: {
              id: true,
              name: true,
              color: true,
            }
          }
        }
      });

      // Invalidate caches
      await cacheInvalidationV2.prompt.create(prompt.id, user.id, data.tags);

      revalidatePath('/prompts');
      revalidatePath('/folders');

      return { success: true, prompt };
    });
  }
);

// Optimized update prompt with validation
export const updatePrompt = withActionValidation(
  promptSchemas.update,
  async (data: UpdatePromptInput) => {
    const user = await requireAuth();
    
    return PerformanceMonitor.measureQuery('updatePrompt', async () => {
      // Check ownership first
      const existingPrompt = await db.prompt.findUnique({
        where: { id: data.id, userId: user.id },
        select: { id: true }
      });

      if (!existingPrompt) {
        return { success: false, error: 'Prompt not found' };
      }

      const prompt = await db.prompt.update({
        where: { id: data.id },
        data: {
          title: data.title,
          description: data.description,
          content: data.content,
          folderId: data.folderId,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          title: true,
          description: true,
          content: true,
          updatedAt: true,
          tags: {
            select: {
              id: true,
              name: true,
              color: true,
            }
          }
        }
      });

      // Handle tags if provided
      if (data.tags) {
        // Disconnect existing tags
        await db.prompt.update({
          where: { id: data.id },
          data: {
            tags: {
              set: []
            }
          }
        });

        // Connect new tags
        if (data.tags.length > 0) {
          const tags = await db.tag.findMany({
            where: { name: { in: data.tags } },
            select: { id: true }
          });

          await db.prompt.update({
            where: { id: data.id },
            data: {
              tags: {
                connect: tags.map(tag => ({ id: tag.id }))
              }
            }
          });
        }
      }

      // Invalidate caches
      await cacheInvalidationV2.prompt.update(prompt.id, user.id, data.tags);

      revalidatePath('/prompts');
      revalidatePath(`/prompts/${data.id}`);

      return { success: true, prompt };
    });
  }
);

// Optimized delete prompt
export async function deletePrompt(promptId: string) {
  const user = await requireAuth();
  
  return PerformanceMonitor.measureQuery('deletePrompt', async () => {
    // Check ownership
    const prompt = await db.prompt.findUnique({
      where: { id: promptId, userId: user.id },
      select: { id: true }
    });

    if (!prompt) {
      return { success: false, error: 'Prompt not found' };
    }

    await db.prompt.delete({
      where: { id: promptId }
    });

    // Invalidate caches
    await cacheInvalidationV2.prompt.delete(promptId, user.id);

    revalidatePath('/prompts');
    revalidatePath('/folders');

    return { success: true };
  });
}

// Batch operations for better performance
export async function updatePromptOrder(updates: Array<{ id: string; order: number; folderId?: string | null }>) {
  const user = await requireAuth();
  
  return PerformanceMonitor.measureQuery('updatePromptOrder', async () => {
    // Verify ownership of all prompts
    const promptIds = updates.map(u => u.id);
    const existingPrompts = await db.prompt.findMany({
      where: {
        id: { in: promptIds },
        userId: user.id
      },
      select: { id: true }
    });

    if (existingPrompts.length !== promptIds.length) {
      return { success: false, error: 'Some prompts not found' };
    }

    // Update in a transaction for consistency
    await db.$transaction(
      updates.map(update =>
        db.prompt.update({
          where: { id: update.id },
          data: {
            order: update.order,
            folderId: update.folderId,
            updatedAt: new Date()
          }
        })
      )
    );

    // Invalidate caches
    await cacheInvalidationV2.prompt.update(promptIds[0], user.id);

    revalidatePath('/prompts');
    revalidatePath('/folders');

    return { success: true };
  });
}

// Get prompt details with optimized queries
export async function getPromptDetails(promptId: string) {
  const user = await requireAuth();
  
  return PerformanceMonitor.measureQuery('getPromptDetails', async () => {
    const prompt = await db.prompt.findUnique({
      where: { id: promptId, userId: user.id },
      select: {
        id: true,
        title: true,
        description: true,
        content: true,
        pinnedAt: true,
        order: true,
        createdAt: true,
        updatedAt: true,
        folderId: true,
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          }
        },
        _count: {
          select: {
            likes: true,
            favorites: true,
            versions: true,
          },
        },
      }
    });

    if (!prompt) {
      return null;
    }

    // Get like and favorite status
    const [isLiked, isFavorited] = await Promise.all([
      db.promptLike.findUnique({
        where: {
          promptId_userId: {
            promptId,
            userId: user.id
          }
        },
        select: { id: true }
      }).then(result => !!result),
      db.promptFavorite.findUnique({
        where: {
          promptId_userId: {
            promptId,
            userId: user.id
          }
        },
        select: { id: true }
      }).then(result => !!result)
    ]);

    return {
      ...prompt,
      likeCount: prompt._count.likes,
      favoriteCount: prompt._count.favorites,
      versionCount: prompt._count.versions,
      isLikedByUser: isLiked,
      isFavoritedByUser: isFavorited,
      isPinned: !!prompt.pinnedAt,
    };
  });
}