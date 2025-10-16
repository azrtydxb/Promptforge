"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

/**
 * Follow a user
 */
export async function followUser(targetUserId: string) {
  try {
    const user = await requireAuth();

    // Can't follow yourself
    if (user.id === targetUserId) {
      return { success: false, error: "You cannot follow yourself" };
    }

    // Check if target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // Check if already following
    const existing = await db.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: targetUserId,
        },
      },
    });

    if (existing) {
      return { success: false, error: "Already following this user" };
    }

    // Create follow relationship
    await db.userFollow.create({
      data: {
        followerId: user.id,
        followingId: targetUserId,
      },
    });

    logger.info("User followed", {
      followerId: user.id,
      followingId: targetUserId,
    });

    revalidatePath(`/users/${targetUserId}`);
    revalidatePath("/following");
    return { success: true };
  } catch (error) {
    logger.error("Failed to follow user", { error, targetUserId });
    return { success: false, error: "Failed to follow user" };
  }
}

/**
 * Unfollow a user
 */
export async function unfollowUser(targetUserId: string) {
  try {
    const user = await requireAuth();

    // Delete follow relationship
    await db.userFollow.delete({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: targetUserId,
        },
      },
    });

    logger.info("User unfollowed", {
      followerId: user.id,
      followingId: targetUserId,
    });

    revalidatePath(`/users/${targetUserId}`);
    revalidatePath("/following");
    return { success: true };
  } catch (error) {
    logger.error("Failed to unfollow user", { error, targetUserId });
    return { success: false, error: "Failed to unfollow user" };
  }
}

/**
 * Check if current user is following a target user
 */
export async function isFollowing(targetUserId: string) {
  try {
    const user = await requireAuth();

    if (user.id === targetUserId) {
      return { success: true, isFollowing: false };
    }

    const follow = await db.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: targetUserId,
        },
      },
    });

    return { success: true, isFollowing: !!follow };
  } catch {
    // Not authenticated or error
    return { success: true, isFollowing: false };
  }
}

/**
 * Get users that the current user is following
 */
export async function getFollowing(userId?: string) {
  try {
    const user = await requireAuth();
    const targetUserId = userId || user.id;

    const following = await db.userFollow.findMany({
      where: { followerId: targetUserId },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true,
            avatarType: true,
            _count: {
              select: {
                prompts: true,
                followers: true,
                following: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    logger.info("Retrieved following list", {
      userId: targetUserId,
      count: following.length,
    });

    return { success: true, following: following.map((f) => f.following) };
  } catch (error) {
    logger.error("Failed to get following list", { error, userId });
    return { success: false, error: "Failed to retrieve following list" };
  }
}

/**
 * Get users following the current user (followers)
 */
export async function getFollowers(userId?: string) {
  try {
    const user = await requireAuth();
    const targetUserId = userId || user.id;

    const followers = await db.userFollow.findMany({
      where: { followingId: targetUserId },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true,
            avatarType: true,
            _count: {
              select: {
                prompts: true,
                followers: true,
                following: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    logger.info("Retrieved followers list", {
      userId: targetUserId,
      count: followers.length,
    });

    return { success: true, followers: followers.map((f) => f.follower) };
  } catch (error) {
    logger.error("Failed to get followers list", { error, userId });
    return { success: false, error: "Failed to retrieve followers list" };
  }
}

/**
 * Get follow stats for a user
 */
export async function getFollowStats(userId: string) {
  try {
    const [followersCount, followingCount] = await Promise.all([
      db.userFollow.count({
        where: { followingId: userId },
      }),
      db.userFollow.count({
        where: { followerId: userId },
      }),
    ]);

    return {
      success: true,
      stats: {
        followers: followersCount,
        following: followingCount,
      },
    };
  } catch (error) {
    logger.error("Failed to get follow stats", { error, userId });
    return {
      success: false,
      error: "Failed to retrieve follow stats",
      stats: { followers: 0, following: 0 },
    };
  }
}

/**
 * Get suggested users to follow
 * Based on users with most shared prompts that current user is not following
 */
export async function getSuggestedUsers(limit = 10) {
  try {
    const user = await requireAuth();

    // Get users current user is already following
    const following = await db.userFollow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    // Get suggested users
    const suggested = await db.user.findMany({
      where: {
        id: {
          notIn: [...followingIds, user.id], // Exclude already following and self
        },
      },
      select: {
        id: true,
        name: true,
        username: true,
        profilePicture: true,
        avatarType: true,
        _count: {
          select: {
            prompts: true,
            followers: true,
          },
        },
      },
      orderBy: [
        { followers: { _count: "desc" } },
        { prompts: { _count: "desc" } },
      ],
      take: limit,
    });

    logger.info("Retrieved suggested users", {
      userId: user.id,
      count: suggested.length,
    });

    return { success: true, users: suggested };
  } catch (error) {
    logger.error("Failed to get suggested users", { error });
    return { success: false, error: "Failed to retrieve suggested users" };
  }
}
