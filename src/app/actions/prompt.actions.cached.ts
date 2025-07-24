"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidateTag } from "next/cache";
import { unstable_cache } from "next/cache";

// Cached version of getPromptsByFolder
export const getPromptsByFolder = unstable_cache(
  async (folderId?: string) => {
    const user = await requireAuth();

    const prompts = await db.prompt.findMany({
      where: {
        userId: user.id,
        folderId: folderId || null,
      },
      include: {
        tags: true,
        likes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
      orderBy: [
        { pinnedAt: "desc" },
        { order: "asc" },
      ],
    });

    // Add computed fields for easier frontend consumption
    const promptsWithLikeData = prompts.map(prompt => ({
      ...prompt,
      likeCount: prompt._count.likes,
      isLikedByUser: prompt.likes.some((like: { userId: string }) => like.userId === user.id),
    }));

    return promptsWithLikeData;
  },
  ['prompts-by-folder'],
  {
    revalidate: 60, // 1 minute
    tags: ['prompts', 'folders', 'user-prompts']
  }
);

// Cached version of getAllPrompts
export const getAllPrompts = unstable_cache(
  async () => {
    const user = await requireAuth();

    const prompts = await db.prompt.findMany({
      where: {
        userId: user.id,
      },
      include: {
        tags: true,
        likes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
      orderBy: [
        { pinnedAt: "desc" },
        { updatedAt: "desc" },
      ],
    });

    // Add computed fields for easier frontend consumption
    const promptsWithLikeData = prompts.map(prompt => ({
      ...prompt,
      likeCount: prompt._count.likes,
      isLikedByUser: prompt.likes.some((like: { userId: string }) => like.userId === user.id),
    }));

    return promptsWithLikeData;
  },
  ['all-prompts'],
  {
    revalidate: 60, // 1 minute
    tags: ['prompts', 'user-prompts']
  }
);

// Cached version of getPromptById
export const getPromptById = unstable_cache(
  async (id: string) => {
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
      },
    });

    return prompt;
  },
  ['prompt-by-id'],
  {
    revalidate: 300, // 5 minutes
    tags: ['prompts', 'prompt-details']
  }
);

// Cached version of searchPrompts
export const searchPrompts = unstable_cache(
  async (query: string) => {
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
  },
  ['search-prompts'],
  {
    revalidate: 120, // 2 minutes
    tags: ['prompts', 'search']
  }
);

// Cached version of getPromptVersions
export const getPromptVersions = unstable_cache(
  async (promptId: string) => {
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
  },
  ['prompt-versions'],
  {
    revalidate: 300, // 5 minutes
    tags: ['prompts', 'versions']
  }
);

// Cached version of getPromptLikes
export const getPromptLikes = unstable_cache(
  async (promptId: string) => {
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
    });

    return likes;
  },
  ['prompt-likes'],
  {
    revalidate: 60, // 1 minute
    tags: ['prompts', 'likes']
  }
);

// Cache invalidation helpers
export async function invalidatePromptCaches(userId?: string, promptId?: string) {
  revalidateTag('prompts');
  revalidateTag('user-prompts');
  revalidateTag('search');
  
  if (userId) {
    revalidateTag(`user-${userId}`);
  }
  
  if (promptId) {
    revalidateTag(`prompt-${promptId}`);
    revalidateTag('prompt-details');
    revalidateTag('versions');
    revalidateTag('likes');
  }
}

// Wrapper functions for mutations that invalidate cache
export async function createPromptWithCache(params: {
  title: string;
  description?: string;
  content?: string;
  folderId?: string;
  tags?: string[];
}) {
  const { createPrompt } = await import('./prompt.actions');
  const result = await createPrompt(params);
  
  // Invalidate relevant caches
  await invalidatePromptCaches();
  revalidateTag('folders');
  
  return result;
}

export async function updatePromptWithCache(
  id: string,
  params: {
    title?: string;
    content?: string;
    tags?: string[];
    description?: string;
  }
) {
  const { updatePrompt } = await import('./prompt.actions');
  const result = await updatePrompt(id, params);
  
  // Invalidate relevant caches
  await invalidatePromptCaches(undefined, id);
  
  return result;
}

export async function deletePromptWithCache(id: string) {
  const { deletePrompt } = await import('./prompt.actions');
  await deletePrompt(id);
  
  // Invalidate relevant caches
  await invalidatePromptCaches(undefined, id);
}

export async function renamePromptWithCache(id: string, title: string) {
  const { renamePrompt } = await import('./prompt.actions');
  const result = await renamePrompt(id, title);
  
  // Invalidate relevant caches
  await invalidatePromptCaches(undefined, id);
  
  return result;
}

export async function movePromptWithCache(id: string, folderId: string | null, order: number) {
  const { movePrompt } = await import('./prompt.actions');
  await movePrompt(id, folderId, order);
  
  // Invalidate relevant caches
  await invalidatePromptCaches(undefined, id);
  revalidateTag('folders');
}

export async function togglePromptLikeWithCache(promptId: string) {
  const { togglePromptLike } = await import('./prompt.actions');
  const result = await togglePromptLike(promptId);
  
  // Invalidate like-related caches
  revalidateTag('likes');
  revalidateTag('prompts');
  
  return result;
}

export async function createPromptVersionWithCache(params: {
  promptId: string;
  content: string;
  changeMessage?: string;
  versionType: 'minor' | 'major';
}) {
  const { createPromptVersion } = await import('./prompt.actions');
  const result = await createPromptVersion(params);
  
  // Invalidate version-related caches
  await invalidatePromptCaches(undefined, params.promptId);
  
  return result;
}

export async function restoreVersionWithCache(versionId: string) {
  const { restoreVersion } = await import('./prompt.actions');
  const result = await restoreVersion(versionId);
  
  // Invalidate relevant caches
  revalidateTag('prompts');
  revalidateTag('versions');
  revalidateTag('prompt-details');
  
  return result;
}