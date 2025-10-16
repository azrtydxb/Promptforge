"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Validation schemas
const ratingSchema = z.object({
  rating: z.number().min(1).max(5),
  review: z.string().max(1000).optional(),
});

/**
 * Add or update a rating for a shared prompt
 */
export async function ratePrompt(
  sharedPromptId: string,
  input: z.infer<typeof ratingSchema>
) {
  try {
    const user = await requireAuth();
    const validated = ratingSchema.parse(input);

    // Check if shared prompt exists
    const sharedPrompt = await db.sharedPrompt.findUnique({
      where: { id: sharedPromptId },
    });

    if (!sharedPrompt) {
      return { success: false, error: "Prompt not found" };
    }

    // Upsert rating (create or update)
    const rating = await db.promptRating.upsert({
      where: {
        sharedPromptId_userId: {
          sharedPromptId,
          userId: user.id,
        },
      },
      create: {
        sharedPromptId,
        userId: user.id,
        rating: validated.rating,
        review: validated.review,
      },
      update: {
        rating: validated.rating,
        review: validated.review,
      },
    });

    // Recalculate average rating
    const ratings = await db.promptRating.findMany({
      where: { sharedPromptId },
      select: { rating: true },
    });

    const averageRating =
      ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    // Update shared prompt with new average
    await db.sharedPrompt.update({
      where: { id: sharedPromptId },
      data: {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        ratingCount: ratings.length,
      },
    });

    logger.info("Prompt rated", {
      sharedPromptId,
      userId: user.id,
      rating: validated.rating,
    });

    revalidatePath(`/marketplace/${sharedPromptId}`);
    revalidatePath("/marketplace");
    return { success: true, rating };
  } catch (error) {
    logger.error("Failed to rate prompt", { error, sharedPromptId });

    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }

    return { success: false, error: "Failed to rate prompt" };
  }
}

/**
 * Delete a rating
 */
export async function deleteRating(sharedPromptId: string) {
  try {
    const user = await requireAuth();

    // Delete rating
    await db.promptRating.delete({
      where: {
        sharedPromptId_userId: {
          sharedPromptId,
          userId: user.id,
        },
      },
    });

    // Recalculate average rating
    const ratings = await db.promptRating.findMany({
      where: { sharedPromptId },
      select: { rating: true },
    });

    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    // Update shared prompt
    await db.sharedPrompt.update({
      where: { id: sharedPromptId },
      data: {
        averageRating: ratings.length > 0 ? Math.round(averageRating * 10) / 10 : 0,
        ratingCount: ratings.length,
      },
    });

    logger.info("Rating deleted", {
      sharedPromptId,
      userId: user.id,
    });

    revalidatePath(`/marketplace/${sharedPromptId}`);
    revalidatePath("/marketplace");
    return { success: true };
  } catch (error) {
    logger.error("Failed to delete rating", { error, sharedPromptId });
    return { success: false, error: "Failed to delete rating" };
  }
}

/**
 * Get user's rating for a prompt
 */
export async function getUserRating(sharedPromptId: string) {
  try {
    const user = await requireAuth();

    const rating = await db.promptRating.findUnique({
      where: {
        sharedPromptId_userId: {
          sharedPromptId,
          userId: user.id,
        },
      },
    });

    return { success: true, rating };
  } catch {
    // Not authenticated
    return { success: true, rating: null };
  }
}

/**
 * Get all ratings for a prompt
 */
export async function getPromptRatings(sharedPromptId: string, limit = 50) {
  try {
    const ratings = await db.promptRating.findMany({
      where: { sharedPromptId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    logger.info("Retrieved prompt ratings", {
      sharedPromptId,
      count: ratings.length,
    });

    return { success: true, ratings };
  } catch (error) {
    logger.error("Failed to get prompt ratings", { error, sharedPromptId });
    return { success: false, error: "Failed to retrieve ratings" };
  }
}

/**
 * Get rating statistics for a prompt
 */
export async function getRatingStats(sharedPromptId: string) {
  try {
    const ratings = await db.promptRating.findMany({
      where: { sharedPromptId },
      select: { rating: true },
    });

    if (ratings.length === 0) {
      return {
        success: true,
        stats: {
          average: 0,
          total: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      };
    }

    const distribution = ratings.reduce(
      (acc, r) => {
        acc[r.rating as 1 | 2 | 3 | 4 | 5]++;
        return acc;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    );

    const average = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    return {
      success: true,
      stats: {
        average: Math.round(average * 10) / 10,
        total: ratings.length,
        distribution,
      },
    };
  } catch (error) {
    logger.error("Failed to get rating stats", { error, sharedPromptId });
    return {
      success: false,
      error: "Failed to retrieve rating statistics",
      stats: { average: 0, total: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    };
  }
}

/**
 * Get highest rated prompts
 */
export async function getTopRatedPrompts(limit = 20) {
  try {
    const prompts = await db.sharedPrompt.findMany({
      where: {
        isPublished: true,
        status: "APPROVED",
        ratingCount: {
          gte: 5, // Minimum 5 ratings to appear in top rated
        },
      },
      include: {
        prompt: {
          select: {
            title: true,
            description: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
      orderBy: [{ averageRating: "desc" }, { ratingCount: "desc" }],
      take: limit,
    });

    return { success: true, prompts };
  } catch (error) {
    logger.error("Failed to get top rated prompts", { error });
    return { success: false, error: "Failed to retrieve top rated prompts" };
  }
}

/**
 * Get user's rated prompts
 */
export async function getUserRatedPrompts(userId?: string) {
  try {
    const user = await requireAuth();
    const targetUserId = userId || user.id;

    const ratings = await db.promptRating.findMany({
      where: { userId: targetUserId },
      include: {
        sharedPrompt: {
          include: {
            prompt: {
              select: {
                title: true,
                description: true,
              },
            },
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    logger.info("Retrieved user rated prompts", {
      userId: targetUserId,
      count: ratings.length,
    });

    return { success: true, ratings };
  } catch (error) {
    logger.error("Failed to get user rated prompts", { error, userId });
    return { success: false, error: "Failed to retrieve rated prompts" };
  }
}
