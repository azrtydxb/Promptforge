"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  onPromptCreate,
  onPromptUpdate,
  onPromptDelete,
  onPromptMove,
  onPromptTagsUpdate
} from '@/lib/cache-manager';

export type PromptSort = "Recently used" | "Recently updated" | "Most used" | "A–Z";

function getOrderBy(sort?: PromptSort) {
  switch (sort) {
    case "Recently used":
      return [{ pinnedAt: { sort: 'desc' as const, nulls: 'last' as const } }, { lastUsedAt: { sort: 'desc' as const, nulls: 'last' as const } }];
    case "Most used":
      return [{ pinnedAt: { sort: 'desc' as const, nulls: 'last' as const } }, { usageCount: 'desc' as const }];
    case "A–Z":
      return [{ pinnedAt: { sort: 'desc' as const, nulls: 'last' as const } }, { title: 'asc' as const }];
    case "Recently updated":
    default:
      return [{ pinnedAt: { sort: 'desc' as const, nulls: 'last' as const } }, { updatedAt: 'desc' as const }];
  }
}

export async function getPromptsByFolder(folderId?: string, sort?: PromptSort) {
  const user = await requireAuth();

  // Main query with simple includes only - uses indexes efficiently
  const prompts = await db.prompt.findMany({
    where: {
      userId: user.id,
      folderId: folderId || null,
    },
    include: {
      tags: true,
      _count: { select: { versions: true } },
    },
    orderBy: getOrderBy(sort),
  });

  // Early return if no prompts found
  if (prompts.length === 0) {
    return [];
  }

  const promptIds = prompts.map(p => p.id);

  // Separate efficient queries for counts and user-specific data
  const [likeCounts, favoriteCounts, userLikes, userFavorites] = await Promise.all([
    // Get like counts using groupBy aggregation
    db.promptLike.groupBy({
      by: ['promptId'],
      where: { promptId: { in: promptIds } },
      _count: { promptId: true },
    }),
    // Get favorite counts using groupBy aggregation
    db.promptFavorite.groupBy({
      by: ['promptId'],
      where: { promptId: { in: promptIds } },
      _count: { promptId: true },
    }),
    // Check which prompts this user has liked
    db.promptLike.findMany({
      where: {
        promptId: { in: promptIds },
        userId: user.id,
      },
      select: { promptId: true },
    }),
    // Check which prompts this user has favorited
    db.promptFavorite.findMany({
      where: {
        promptId: { in: promptIds },
        userId: user.id,
      },
      select: { promptId: true },
    }),
  ]);

  // Create lookup maps for O(1) access
  const likeCountMap = new Map(
    likeCounts.map(item => [item.promptId, item._count.promptId])
  );
  const favoriteCountMap = new Map(
    favoriteCounts.map(item => [item.promptId, item._count.promptId])
  );
  const userLikedSet = new Set(userLikes.map(like => like.promptId));
  const userFavoritedSet = new Set(userFavorites.map(fav => fav.promptId));

  // Merge results in application layer
  const promptsWithLikeData = prompts.map(prompt => ({
    ...prompt,
    likeCount: likeCountMap.get(prompt.id) || 0,
    favoriteCount: favoriteCountMap.get(prompt.id) || 0,
    isLikedByUser: userLikedSet.has(prompt.id),
    isFavoritedByUser: userFavoritedSet.has(prompt.id),
    isPinned: !!prompt.pinnedAt,
  }));

  return promptsWithLikeData;
}

export async function getAllPrompts(sort?: PromptSort) {
  const user = await requireAuth();

  // Main query with simple includes only - uses indexes efficiently
  const prompts = await db.prompt.findMany({
    where: {
      userId: user.id,
    },
    include: {
      tags: true,
      _count: { select: { versions: true } },
    },
    orderBy: getOrderBy(sort),
  });

  // Early return if no prompts found
  if (prompts.length === 0) {
    return [];
  }

  const promptIds = prompts.map(p => p.id);

  // Separate efficient queries for counts and user-specific data
  const [likeCounts, favoriteCounts, userLikes, userFavorites] = await Promise.all([
    // Get like counts using groupBy aggregation
    db.promptLike.groupBy({
      by: ['promptId'],
      where: { promptId: { in: promptIds } },
      _count: { promptId: true },
    }),
    // Get favorite counts using groupBy aggregation
    db.promptFavorite.groupBy({
      by: ['promptId'],
      where: { promptId: { in: promptIds } },
      _count: { promptId: true },
    }),
    // Check which prompts this user has liked
    db.promptLike.findMany({
      where: {
        promptId: { in: promptIds },
        userId: user.id,
      },
      select: { promptId: true },
    }),
    // Check which prompts this user has favorited
    db.promptFavorite.findMany({
      where: {
        promptId: { in: promptIds },
        userId: user.id,
      },
      select: { promptId: true },
    }),
  ]);

  // Create lookup maps for O(1) access
  const likeCountMap = new Map(
    likeCounts.map(item => [item.promptId, item._count.promptId])
  );
  const favoriteCountMap = new Map(
    favoriteCounts.map(item => [item.promptId, item._count.promptId])
  );
  const userLikedSet = new Set(userLikes.map(like => like.promptId));
  const userFavoritedSet = new Set(userFavorites.map(fav => fav.promptId));

  // Merge results in application layer
  const promptsWithLikeData = prompts.map(prompt => ({
    ...prompt,
    likeCount: likeCountMap.get(prompt.id) || 0,
    favoriteCount: favoriteCountMap.get(prompt.id) || 0,
    isLikedByUser: userLikedSet.has(prompt.id),
    isFavoritedByUser: userFavoritedSet.has(prompt.id),
    isPinned: !!prompt.pinnedAt,
  }));

  return promptsWithLikeData;
}

export async function renamePrompt(id: string, title: string) {
  const user = await requireAuth();

  const updatedPrompt = await db.prompt.update({
    where: { id, userId: user.id },
    data: { title },
  });

  // Cache invalidation
  await onPromptUpdate(user.id, id, { folderId: updatedPrompt.folderId });

  revalidatePath(`/prompts`);
  return updatedPrompt;
}

export async function deletePrompt(id: string) {
  const user = await requireAuth();

  // Get prompt before deletion to know its folderId
  const prompt = await db.prompt.findUnique({
    where: { id, userId: user.id },
    select: { folderId: true },
  });

  await db.prompt.delete({
    where: { id, userId: user.id },
  });

  // Cache invalidation
  if (prompt) {
    await onPromptDelete(user.id, id);
  }

  revalidatePath(`/prompts`);
}

interface CreatePromptParams {
  title: string;
  description?: string;
  content?: string;
  folderId?: string;
  tags?: string[];
}

export async function createPrompt({
  title,
  description,
  content,
  folderId,
  tags,
}: CreatePromptParams) {
  try {
    const user = await requireAuth();

    const lastPrompt = await db.prompt.findFirst({
      where: { userId: user.id, folderId },
      orderBy: { order: "desc" },
    });

    const newOrder = lastPrompt ? lastPrompt.order! + 1 : 0;

    const newPrompt = await db.prompt.create({
      data: {
        title,
        description,
        content,
        userId: user.id,
        folderId,
        order: newOrder,
        tags: {
          connectOrCreate: tags?.map((tag) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
        versions: {
          create: {
            content: content || "",
            version: "1.0",
            changeMessage: "Initial version",
          },
        },
      },
    });

    // Cache invalidation
    await onPromptCreate(user.id, { invalidateFolders: !!folderId });

    revalidatePath(`/prompts`);
    if (folderId) {
      revalidatePath(`/prompts/folders/${folderId}`);
    }

    return newPrompt;
  } catch (_error) {
    throw _error;
  }
}

export async function getPromptById(id: string) {
  const user = await requireAuth();

  const prompt = await db.prompt.findUnique({
    where: { id, userId: user.id },
    include: {
      tags: true,
      versions: {
        orderBy: {
          createdAt: 'desc',
        },
      },
      favorites: {
        where: { userId: user.id },
        select: { id: true },
      },
      _count: {
        select: { favorites: true },
      },
    },
  });

  // If prompt content is empty but versions exist, sync with latest version
  if (prompt && (!prompt.content || prompt.content.trim() === '') && prompt.versions.length > 0) {
    const latestVersion = prompt.versions[0];

    // Update the prompt content with the latest version
    await db.prompt.update({
      where: { id },
      data: { content: latestVersion.content }
    });

    // Return the updated prompt with the content
    return {
      ...prompt,
      content: latestVersion.content
    };
  }

  return prompt;
}

interface UpdatePromptParams {
  title?: string;
  content?: string;
  tags?: string[];
  description?: string;
}

export async function updatePrompt(
  id: string,
  { title, content, tags, description }: UpdatePromptParams
) {
  const user = await requireAuth();

  const existingPrompt = await db.prompt.findUnique({
    where: { id, userId: user.id },
  });

  if (!existingPrompt) {
    throw new Error("Prompt not found");
  }

  const updatedPrompt = await db.prompt.update({
    where: { id, userId: user.id },
    data: {
      title,
      description,
      content,
      tags: tags
        ? {
            set: [],
            connectOrCreate: tags.map((tag) => ({
              where: { name: tag },
              create: { name: tag },
            })),
          }
        : undefined,
    },
  });

  // Cache invalidation
  await onPromptUpdate(user.id, id, { folderId: existingPrompt.folderId });
  if (tags) {
    await onPromptTagsUpdate(user.id, id);
  }

  revalidatePath(`/prompts/${id}`);
  return updatedPrompt;
}

interface CreatePromptVersionParams {
  promptId: string;
  content: string;
  changeMessage?: string;
  versionType: 'minor' | 'major';
}

export async function createPromptVersion({
  promptId,
  content,
  changeMessage,
  versionType,
}: CreatePromptVersionParams) {
  const user = await requireAuth();

  const prompt = await db.prompt.findUnique({
    where: { id: promptId, userId: user.id },
    include: { versions: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  if (!prompt) {
    throw new Error("Prompt not found");
  }

  const lastVersion = prompt.versions[0];
  let newVersionNumber: string;

  if (lastVersion && lastVersion.version) {
    const [major, minor] = lastVersion.version.split('.').map(Number);
    if (versionType === 'major') {
      newVersionNumber = `${major + 1}.0`;
    } else {
      newVersionNumber = `${major}.${minor + 1}`;
    }
  } else {
    newVersionNumber = '1.0';
  }

  const newVersion = await db.promptVersion.create({
    data: {
      promptId,
      content,
      changeMessage,
      version: newVersionNumber,
    },
  });

  // Also update the main prompt content
  await db.prompt.update({
    where: { id: promptId },
    data: { content },
  });

  revalidatePath(`/prompts/${promptId}`);
  return newVersion;
}

export async function getPromptVersions(promptId: string) {
  const user = await requireAuth();

  const versions = await db.promptVersion.findMany({
    where: {
      prompt: {
        id: promptId,
        userId: user.id,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return versions;
}

export async function restoreVersion(versionId: string) {
  const user = await requireAuth();

  const version = await db.promptVersion.findUnique({
    where: { id: versionId },
    include: { prompt: true },
  });

  if (!version || version.prompt.userId !== user.id) {
    throw new Error("Version not found");
  }

  const updatedPrompt = await db.prompt.update({
    where: { id: version.promptId },
    data: { content: version.content },
  });

  revalidatePath(`/prompts/${version.promptId}`);
  return updatedPrompt;
}

export async function movePrompt(id: string, folderId: string | null, order: number) {
  const user = await requireAuth();

  await db.prompt.update({
    where: { id, userId: user.id },
    data: { folderId, order },
  });

  // Cache invalidation
  await onPromptMove(user.id, id);

  revalidatePath(`/prompts`);
  if (folderId) {
    revalidatePath(`/prompts/folders/${folderId}`);
  }
}

export async function searchPrompts(query: string) {
  const user = await requireAuth();

  const prompts = await db.prompt.findMany({
    where: {
      userId: user.id,
      OR: [
        {
          title: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          content: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          tags: {
            some: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        },
      ],
    },
    include: {
      tags: true,
    },
  });

  return prompts;
}

// Like/Unlike functionality
export async function likePrompt(promptId: string) {
  const user = await requireAuth();

  try {
    // Check if the user has already liked this prompt
    const existingLike = await db.promptLike.findUnique({
      where: {
        promptId_userId: {
          promptId,
          userId: user.id,
        },
      },
    });

    if (existingLike) {
      throw new Error("You have already liked this prompt");
    }

    // Create the like
    const like = await db.promptLike.create({
      data: {
        promptId,
        userId: user.id,
      },
    });

    revalidatePath("/prompts");
    return like;
  } catch (_error) {
    throw _error;
  }
}

export async function unlikePrompt(promptId: string) {
  const user = await requireAuth();

  try {
    // Find and delete the like
    const deletedLike = await db.promptLike.delete({
      where: {
        promptId_userId: {
          promptId,
          userId: user.id,
        },
      },
    });

    revalidatePath("/prompts");
    return deletedLike;
  } catch (_error) {
    throw _error;
  }
}

export async function togglePromptLike(promptId: string) {
  const user = await requireAuth();

  try {
    // Check if the user has already liked this prompt
    const existingLike = await db.promptLike.findUnique({
      where: {
        promptId_userId: {
          promptId,
          userId: user.id,
        },
      },
    });

    if (existingLike) {
      // Unlike the prompt
      await db.promptLike.delete({
        where: {
          promptId_userId: {
            promptId,
            userId: user.id,
          },
        },
      });
      revalidatePath("/prompts");
      return { liked: false };
    } else {
      // Like the prompt
      await db.promptLike.create({
        data: {
          promptId,
          userId: user.id,
        },
      });
      revalidatePath("/prompts");
      return { liked: true };
    }
  } catch (_error) {
    throw _error;
  }
}

export async function getPromptLikes(promptId: string) {
  try {
    const likes = await db.promptLike.findMany({
      where: {
        promptId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return likes;
  } catch (_error) {
    throw _error;
  }
}

export async function duplicatePrompt(promptId: string) {
  const user = await requireAuth();

  // Get the original prompt with all its relations
  const originalPrompt = await db.prompt.findUnique({
    where: {
      id: promptId,
      userId: user.id,
    },
    include: {
      tags: true,
    },
  });

  if (!originalPrompt) {
    throw new Error("Prompt not found or you don't have permission to duplicate it");
  }

  // Create the duplicated prompt
  const duplicatedPrompt = await db.prompt.create({
    data: {
      title: `${originalPrompt.title} (Copy)`,
      content: originalPrompt.content,
      description: originalPrompt.description,
      userId: user.id,
      folderId: originalPrompt.folderId,
      tags: {
        connect: originalPrompt.tags.map((tag) => ({
          id: tag.id,
        })),
      },
    },
    include: {
      tags: true,
    },
  });

  revalidatePath("/prompts");
  return duplicatedPrompt;
}

export async function updatePromptLastUsed(promptId: string) {
  const user = await requireAuth();

  await db.prompt.update({
    where: {
      id: promptId,
      userId: user.id,
    },
    data: {
      lastUsedAt: new Date(),
    },
  });
}

export async function getRecentlyUsedPrompts(limit: number = 10) {
  const user = await requireAuth();

  const prompts = await db.prompt.findMany({
    where: {
      userId: user.id,
      lastUsedAt: {
        not: null,
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
    take: limit,
  });

  return prompts;
}

// Pin/Unpin functionality
export async function pinPrompt(promptId: string) {
  const user = await requireAuth();

  try {
    const prompt = await db.prompt.findFirst({
      where: {
        id: promptId,
        userId: user.id,
      },
    });

    if (!prompt) {
      throw new Error("Prompt not found or you don't have permission");
    }

    // Toggle pin status
    const updatedPrompt = await db.prompt.update({
      where: {
        id: promptId,
      },
      data: {
        pinnedAt: prompt.pinnedAt ? null : new Date(),
      },
    });

    revalidatePath("/prompts");
    return {
      success: true,
      isPinned: !!updatedPrompt.pinnedAt
    };
  } catch (_error) {
    return {
      success: false,
      error: _error instanceof Error ? "Failed" : "Failed to update pin status"
    };
  }
}

export async function getPinnedPrompts() {
  const user = await requireAuth();

  const prompts = await db.prompt.findMany({
    where: {
      userId: user.id,
      pinnedAt: {
        not: null,
      },
    },
    include: {
      tags: true,
      favorites: {
        where: {
          userId: user.id,
        },
      },
      _count: {
        select: {
          likes: true,
          favorites: true,
        },
      },
    },
    orderBy: {
      pinnedAt: 'desc',
    },
  });

  // Add computed fields
  const promptsWithData = prompts.map(prompt => ({
    ...prompt,
    isFavorited: prompt.favorites.length > 0,
    isPinned: true,
  }));

  return promptsWithData;
}