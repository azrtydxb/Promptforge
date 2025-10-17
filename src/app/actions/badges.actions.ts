"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";
import { BadgeType } from "@/generated/prisma";

// Badge thresholds and requirements
const BADGE_REQUIREMENTS = {
  CREATOR: {
    title: "Creator",
    description: "Created your first prompt",
    requirement: 1, // 1 prompt
    icon: "✨",
  },
  POPULAR: {
    title: "Popular Creator",
    description: "Received 100+ likes on shared prompts",
    requirement: 100, // 100 likes
    icon: "🌟",
  },
  HELPFUL: {
    title: "Helpful Community Member",
    description: "Received 50+ ratings with 4+ star average",
    requirement: { minRatings: 50, minAverage: 4.0 },
    icon: "💝",
  },
  VERIFIED: {
    title: "Verified Creator",
    description: "Consistently high-quality content",
    requirement: { minPrompts: 10, minAvgRating: 4.5, minFollowers: 50 },
    icon: "✓",
  },
  MODERATOR: {
    title: "Moderator",
    description: "Community moderator",
    icon: "🛡️",
  },
  EARLY_ADOPTER: {
    title: "Early Adopter",
    description: "Joined during beta period",
    icon: "🚀",
  },
};

/**
 * Check and award badges to a user
 */
export async function checkAndAwardBadges(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        badges: true,
        publishedPrompts: {
          include: {
            ratings: true,
            _count: {
              select: { copies: true },
            },
          },
        },
        followers: true,
        _count: {
          select: {
            prompts: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const existingBadgeTypes = user.badges.map((b) => b.type);
    const newBadges: Array<{ type: string; title: string; description: string }> = [];

    // Check CREATOR badge
    if (
      !existingBadgeTypes.includes("CREATOR") &&
      user._count.prompts >= BADGE_REQUIREMENTS.CREATOR.requirement
    ) {
      newBadges.push({
        type: "CREATOR",
        title: BADGE_REQUIREMENTS.CREATOR.title,
        description: BADGE_REQUIREMENTS.CREATOR.description,
      });
    }

    // Check POPULAR badge
    const totalLikes = user.publishedPrompts.reduce(
      (sum, p) => sum + p.likeCount,
      0
    );
    if (
      !existingBadgeTypes.includes("POPULAR") &&
      totalLikes >= BADGE_REQUIREMENTS.POPULAR.requirement
    ) {
      newBadges.push({
        type: "POPULAR",
        title: BADGE_REQUIREMENTS.POPULAR.title,
        description: BADGE_REQUIREMENTS.POPULAR.description,
      });
    }

    // Check HELPFUL badge
    const totalRatings = user.publishedPrompts.reduce(
      (sum, p) => sum + p.ratingCount,
      0
    );
    const avgRating =
      user.publishedPrompts.length > 0
        ? user.publishedPrompts.reduce((sum, p) => sum + (p.averageRating || 0), 0) /
          user.publishedPrompts.length
        : 0;

    if (
      !existingBadgeTypes.includes("HELPFUL") &&
      totalRatings >= BADGE_REQUIREMENTS.HELPFUL.requirement.minRatings &&
      avgRating >= BADGE_REQUIREMENTS.HELPFUL.requirement.minAverage
    ) {
      newBadges.push({
        type: "HELPFUL",
        title: BADGE_REQUIREMENTS.HELPFUL.title,
        description: BADGE_REQUIREMENTS.HELPFUL.description,
      });
    }

    // Check VERIFIED badge
    const followerCount = user.followers.length;
    if (
      !existingBadgeTypes.includes("VERIFIED") &&
      user.publishedPrompts.length >= BADGE_REQUIREMENTS.VERIFIED.requirement.minPrompts &&
      avgRating >= BADGE_REQUIREMENTS.VERIFIED.requirement.minAvgRating &&
      followerCount >= BADGE_REQUIREMENTS.VERIFIED.requirement.minFollowers
    ) {
      newBadges.push({
        type: "VERIFIED",
        title: BADGE_REQUIREMENTS.VERIFIED.title,
        description: BADGE_REQUIREMENTS.VERIFIED.description,
      });
    }

    // Award new badges
    if (newBadges.length > 0) {
      await db.userBadge.createMany({
        data: newBadges.map((badge) => ({
          userId,
          type: badge.type as BadgeType,
          title: badge.title,
          description: badge.description,
        })),
      });

      logger.info("Badges awarded", {
        userId,
        badges: newBadges.map((b) => b.type),
      });
    }

    return { success: true, newBadges };
  } catch (_error) {
    logger.error("Failed to check and award badges", { _error, userId });
    return { success: false, error: "Failed to check badges" };
  }
}

/**
 * Manually award a badge (admin only)
 */
export async function awardBadge(
  userId: string,
  badgeType: string,
  customTitle?: string,
  customDescription?: string
) {
  try {
    const currentUser = await requireAuth();

    // Check if user is admin
    if (currentUser.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    const badgeConfig = BADGE_REQUIREMENTS[badgeType as keyof typeof BADGE_REQUIREMENTS];

    if (!badgeConfig) {
      return { success: false, error: "Invalid badge type" };
    }

    // Check if user already has this badge
    const existing = await db.userBadge.findUnique({
      where: {
        userId_type: {
          userId,
          type: badgeType as BadgeType,
        },
      },
    });

    if (existing) {
      return { success: false, error: "User already has this badge" };
    }

    // Award the badge
    const badge = await db.userBadge.create({
      data: {
        userId,
        type: badgeType as BadgeType,
        title: customTitle || badgeConfig.title,
        description: customDescription || badgeConfig.description,
      },
    });

    logger.info("Badge manually awarded", {
      userId,
      badgeType,
      awardedBy: currentUser.id,
    });

    revalidatePath(`/users/${userId}`);
    return { success: true, badge };
  } catch (_error) {
    logger.error("Failed to award badge", { _error, userId, badgeType });
    return { success: false, error: "Failed to award badge" };
  }
}

/**
 * Remove a badge (admin only)
 */
export async function removeBadge(userId: string, badgeType: string) {
  try {
    const currentUser = await requireAuth();

    // Check if user is admin
    if (currentUser.role !== "ADMIN") {
      return { success: false, error: "Unauthorized: Admin access required" };
    }

    await db.userBadge.delete({
      where: {
        userId_type: {
          userId,
          type: badgeType as BadgeType,
        },
      },
    });

    logger.info("Badge removed", {
      userId,
      badgeType,
      removedBy: currentUser.id,
    });

    revalidatePath(`/users/${userId}`);
    return { success: true };
  } catch (_error) {
    logger.error("Failed to remove badge", { _error, userId, badgeType });
    return { success: false, error: "Failed to remove badge" };
  }
}

/**
 * Get all badges for a user
 */
export async function getUserBadges(userId: string) {
  try {
    const badges = await db.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
    });

    return { success: true, badges };
  } catch (_error) {
    logger.error("Failed to get user badges", { _error, userId });
    return { success: false, error: "Failed to retrieve badges" };
  }
}

/**
 * Get badge requirements and progress
 */
export async function getBadgeProgress(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        badges: true,
        publishedPrompts: {
          select: {
            likeCount: true,
            ratingCount: true,
            averageRating: true,
          },
        },
        followers: true,
        _count: {
          select: {
            prompts: true,
          },
        },
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const totalLikes = user.publishedPrompts.reduce((sum, p) => sum + p.likeCount, 0);
    const totalRatings = user.publishedPrompts.reduce((sum, p) => sum + p.ratingCount, 0);
    const avgRating =
      user.publishedPrompts.length > 0
        ? user.publishedPrompts.reduce((sum, p) => sum + (p.averageRating || 0), 0) /
          user.publishedPrompts.length
        : 0;
    const followerCount = user.followers.length;

    const earnedBadges = user.badges.map((b) => b.type);

    const progress = {
      CREATOR: {
        ...BADGE_REQUIREMENTS.CREATOR,
        earned: earnedBadges.includes("CREATOR"),
        progress: user._count.prompts,
        requirement: BADGE_REQUIREMENTS.CREATOR.requirement,
      },
      POPULAR: {
        ...BADGE_REQUIREMENTS.POPULAR,
        earned: earnedBadges.includes("POPULAR"),
        progress: totalLikes,
        requirement: BADGE_REQUIREMENTS.POPULAR.requirement,
      },
      HELPFUL: {
        ...BADGE_REQUIREMENTS.HELPFUL,
        earned: earnedBadges.includes("HELPFUL"),
        progress: {
          ratings: totalRatings,
          avgRating: avgRating.toFixed(1),
        },
        requirement: BADGE_REQUIREMENTS.HELPFUL.requirement,
      },
      VERIFIED: {
        ...BADGE_REQUIREMENTS.VERIFIED,
        earned: earnedBadges.includes("VERIFIED"),
        progress: {
          prompts: user.publishedPrompts.length,
          avgRating: avgRating.toFixed(1),
          followers: followerCount,
        },
        requirement: BADGE_REQUIREMENTS.VERIFIED.requirement,
      },
      MODERATOR: {
        ...BADGE_REQUIREMENTS.MODERATOR,
        earned: earnedBadges.includes("MODERATOR"),
        manual: true,
      },
      EARLY_ADOPTER: {
        ...BADGE_REQUIREMENTS.EARLY_ADOPTER,
        earned: earnedBadges.includes("EARLY_ADOPTER"),
        manual: true,
      },
    };

    return { success: true, progress };
  } catch (_error) {
    logger.error("Failed to get badge progress", { _error, userId });
    return { success: false, error: "Failed to retrieve badge progress" };
  }
}

/**
 * Calculate and update user reputation score
 */
export async function updateReputationScore(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        badges: true,
        publishedPrompts: true,
        followers: true,
        following: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Calculate reputation score
    let score = 0;

    // Base points for activity
    score += user.publishedPrompts.length * 10; // 10 points per shared prompt

    // Points for engagement
    const totalLikes = user.publishedPrompts.reduce((sum, p) => sum + p.likeCount, 0);
    const totalCopies = user.publishedPrompts.reduce((sum, p) => sum + p.copyCount, 0);
    const totalViews = user.publishedPrompts.reduce((sum, p) => sum + p.viewCount, 0);

    score += totalLikes * 5; // 5 points per like
    score += totalCopies * 15; // 15 points per copy
    score += Math.floor(totalViews / 10); // 1 point per 10 views

    // Points for ratings
    const avgRating =
      user.publishedPrompts.length > 0
        ? user.publishedPrompts.reduce((sum, p) => sum + (p.averageRating || 0), 0) /
          user.publishedPrompts.length
        : 0;
    score += Math.floor(avgRating * 20); // Up to 100 points for 5-star average

    // Points for social
    score += user.followers.length * 2; // 2 points per follower

    // Badge bonuses
    score += user.badges.length * 50; // 50 points per badge

    // Update reputation
    await db.user.update({
      where: { id: userId },
      data: { reputationScore: score },
    });

    logger.info("Reputation score updated", { userId, score });

    return { success: true, score };
  } catch (_error) {
    logger.error("Failed to update reputation score", { _error, userId });
    return { success: false, error: "Failed to update reputation" };
  }
}
