"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

export async function togglePromptFavorite(promptId: string) {
  const user = await requireAuth();

  try {
    // Check if the user has already favorited this prompt
    const existingFavorite = await db.promptFavorite.findUnique({
      where: {
        promptId_userId: {
          promptId,
          userId: user.id,
        },
      },
    });

    if (existingFavorite) {
      // Unfavorite the prompt
      await db.promptFavorite.delete({
        where: {
          promptId_userId: {
            promptId,
            userId: user.id,
          },
        },
      });
      
      logger.info("Prompt unfavorited", { promptId, userId: user.id });
      revalidatePath("/prompts");
      revalidatePath("/favorites");
      return { favorited: false };
    } else {
      // Favorite the prompt
      await db.promptFavorite.create({
        data: {
          promptId,
          userId: user.id,
        },
      });
      
      logger.info("Prompt favorited", { promptId, userId: user.id });
      revalidatePath("/prompts");
      revalidatePath("/favorites");
      return { favorited: true };
    }
  } catch (error) {
    logger.error("Error toggling prompt favorite:", error);
    throw error;
  }
}

export async function getFavoritePrompts() {
  const user = await requireAuth();

  try {
    const favorites = await db.promptFavorite.findMany({
      where: {
        userId: user.id,
      },
      include: {
        prompt: {
          include: {
            tags: true,
            _count: {
              select: {
                likes: true,
                favorites: true,
                versions: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the data to return just the prompts with favorite info
    const prompts = favorites.map((fav) => ({
      ...fav.prompt,
      favoritedAt: fav.createdAt,
      isFavorited: true,
    }));

    return prompts;
  } catch (error) {
    logger.error("Error fetching favorite prompts:", error);
    throw error;
  }
}

export async function checkPromptFavorite(promptId: string) {
  const user = await requireAuth();

  try {
    const favorite = await db.promptFavorite.findUnique({
      where: {
        promptId_userId: {
          promptId,
          userId: user.id,
        },
      },
    });

    return { isFavorited: !!favorite };
  } catch (error) {
    logger.error("Error checking prompt favorite:", error);
    return { isFavorited: false };
  }
}

export async function getFavoriteCount(promptId: string) {
  try {
    const count = await db.promptFavorite.count({
      where: {
        promptId,
      },
    });

    return count;
  } catch (error) {
    logger.error("Error getting favorite count:", error);
    return 0;
  }
}

export async function getMostFavoritedPrompts(limit: number = 10) {
  const user = await requireAuth();

  try {
    const prompts = await db.prompt.findMany({
      where: {
        userId: user.id,
      },
      include: {
        tags: true,
        _count: {
          select: {
            favorites: true,
            likes: true,
            versions: true,
          },
        },
      },
      orderBy: {
        favorites: {
          _count: "desc",
        },
      },
      take: limit,
    });

    // Only return prompts that have at least one favorite
    const favoritedPrompts = prompts.filter((p) => p._count.favorites > 0);

    // Check which ones the current user has favorited
    const userFavorites = await db.promptFavorite.findMany({
      where: {
        userId: user.id,
        promptId: {
          in: favoritedPrompts.map((p) => p.id),
        },
      },
      select: {
        promptId: true,
      },
    });

    const favoriteSet = new Set(userFavorites.map((f) => f.promptId));

    return favoritedPrompts.map((prompt) => ({
      ...prompt,
      isFavorited: favoriteSet.has(prompt.id),
    }));
  } catch (error) {
    logger.error("Error fetching most favorited prompts:", error);
    throw error;
  }
}