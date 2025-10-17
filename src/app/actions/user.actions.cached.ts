"use server";

import { db } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { unstable_cache } from "next/cache";
import bcrypt from "bcryptjs";
import { generateRandomUsername } from "@/lib/username-generator";

interface CreateUserParams {
    name: string;
    email: string;
    image?: string;
}

interface UpdateUserParams {
    name?: string;
    image?: string;
}

interface ChangePasswordParams {
    currentPassword: string;
    newPassword: string;
}

// Cached version of getUserByEmail
export const getUserByEmail = unstable_cache(
  async (email: string) => {
    try {
      const user = await db.user.findUnique({
        where: { email },
      });
      return user;
    } catch (_error) {

      return null;
    }
  },
  ['user-by-email'],
  {
    revalidate: 300, // 5 minutes
    tags: ['users', 'user-lookup']
  }
);

// Cached version of getUserById
export const getUserById = unstable_cache(
  async (id: string) => {
    try {
      const user = await db.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          image: true,
          avatarType: true,
          profilePicture: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return user;
    } catch (_error) {

      return null;
    }
  },
  ['user-by-id'],
  {
    revalidate: 300, // 5 minutes
    tags: ['users', 'user-profile']
  }
);

// Cached version of getUserProfile (extended user info)
export const getUserProfile = unstable_cache(
  async (userId: string) => {
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              prompts: true,
              folders: true,
              promptLikes: true,
            },
          },
        },
      });
      return user;
    } catch (_error) {

      return null;
    }
  },
  ['user-profile'],
  {
    revalidate: 180, // 3 minutes
    tags: ['users', 'user-profile', 'user-stats']
  }
);

// Cache invalidation helper
export async function invalidateUserCaches(userId?: string, email?: string) {
  revalidateTag('users');
  revalidateTag('user-lookup');
  revalidateTag('user-profile');
  revalidateTag('user-stats');
  
  if (userId) {
    revalidateTag(`user-${userId}`);
  }
  
  if (email) {
    revalidateTag(`email-${email}`);
  }
}

// Wrapper functions for mutations that invalidate cache
export async function createUserWithCache(user: CreateUserParams) {
  try {
    // Generate unique username
    let username = generateRandomUsername();
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      const existingUser = await db.user.findUnique({
        where: { username },
      });
      
      if (!existingUser) {
        isUnique = true;
      } else {
        username = generateRandomUsername();
        attempts++;
      }
    }

    if (attempts >= 10) {
      throw new Error("Failed to generate unique username");
    }

    const newUser = await db.user.create({
      data: {
        ...user,
        username,
      },
    });

    // Invalidate relevant caches
    await invalidateUserCaches(newUser.id, newUser.email || undefined);
    
    return newUser;
  } catch (_error) {

    throw _error;
  }
}

export async function updateUserWithCache(userId: string, user: UpdateUserParams) {
  try {
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: user,
    });

    // Invalidate relevant caches
    await invalidateUserCaches(userId, updatedUser.email || undefined);
    
    return updatedUser;
  } catch (_error) {

    throw _error;
  }
}

export async function deleteUserWithCache(userId: string) {
  try {
    const deletedUser = await db.user.delete({
      where: { id: userId },
    });

    // Invalidate relevant caches
    await invalidateUserCaches(userId, deletedUser.email || undefined);
    
    return deletedUser;
  } catch (_error) {

    throw _error;
  }
}

export async function changePasswordWithCache({ currentPassword, newPassword }: ChangePasswordParams) {
  try {
    const user = await requireAuth();
    
    // Get the user's current password hash
    const userWithPassword = await db.user.findUnique({
      where: { id: user.id },
      select: { id: true, password: true }
    });

    if (!userWithPassword || !userWithPassword.password) {
      throw new Error("User not found or no password set");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password);
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await db.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword }
    });

    // Invalidate user caches
    await invalidateUserCaches(user.id);
    
    return { success: true };
  } catch (_error) {

    throw _error;
  }
}