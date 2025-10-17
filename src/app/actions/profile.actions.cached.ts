"use server";

import { unstable_cache, revalidateTag } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-config";
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { validateUsername, generateRandomUsername, generateUsernameFromInfo } from '@/lib/username-generator';
import { validateImageFile, uploadImageToServer } from '@/lib/image-upload';

type AvatarType = 'INITIALS' | 'GRAVATAR' | 'UPLOAD';

/**
 * Profile update validation schema
 */
const profileUpdateSchema = z.object({
  username: z.string().min(3).max(30).optional(),
  avatarType: z.enum(['INITIALS', 'GRAVATAR', 'UPLOAD']).optional(),
  gravatarEmail: z.string().email().optional(),
  profilePicture: z.string().url().optional(),
});

// Internal function for getting user profile (not cached)
async function getCurrentUserProfileInternal(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      avatarType: true,
      profilePicture: true,
      gravatarEmail: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

// Cached version of getCurrentUserProfile
const getCachedUserProfile = unstable_cache(
  async (userId: string) => {
    return getCurrentUserProfileInternal(userId);
  },
  ['user-profile'],
  {
    tags: ['user-profile'],
    revalidate: 900, // 15 minutes
  }
);

/**
 * Gets the current user's profile with caching
 */
export async function getCurrentUserProfile() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const user = await getCachedUserProfile(session.user.id);

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user };
  } catch (_error) {

    return { success: false, error: 'Failed to get user profile' };
  }
}

// Cache invalidation helper for profile
async function invalidateProfileCaches(userId: string) {
  // Invalidate profile-related caches
  revalidateTag('user-profile');
  revalidateTag(`user-${userId}`);
  revalidateTag(`user-${userId}-profile`);
}

/**
 * Updates the current user's profile with cache invalidation
 */
export async function updateUserProfile(data: {
  username?: string;
  avatarType?: AvatarType;
  gravatarEmail?: string;
  profilePicture?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate input
    const validatedData = profileUpdateSchema.parse(data);

    // Check username availability if username is being updated
    if (validatedData.username) {
      const existingUser = await db.user.findFirst({
        where: {
          username: validatedData.username,
          NOT: { id: session.user.id }
        }
      });

      if (existingUser) {
        return { success: false, error: 'Username already taken' };
      }

      // Validate username format
      const usernameValidation = validateUsername(validatedData.username);
      if (!usernameValidation.valid) {
        return { success: false, error: usernameValidation.error || 'Invalid username' };
      }
    }

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatarType: true,
        profilePicture: true,
        gravatarEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Invalidate caches
    await invalidateProfileCaches(session.user.id);

    // Revalidate profile page
    revalidatePath('/profile');

    return { success: true, user: updatedUser };
  } catch (_error) {

    if (_error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input data' };
    }
    return { success: false, error: 'Failed to update profile' };
  }
}

// Internal function for checking username availability (not cached)
async function checkUsernameAvailabilityInternal(username: string, currentUserId?: string) {
  const existingUser = await db.user.findFirst({
    where: {
      username: username,
      ...(currentUserId && { NOT: { id: currentUserId } })
    }
  });

  return !existingUser;
}

// Cached version of username availability check
const getCachedUsernameAvailability = unstable_cache(
  async (username: string, currentUserId?: string) => {
    return checkUsernameAvailabilityInternal(username, currentUserId);
  },
  ['username-availability'],
  {
    tags: ['username-availability'],
    revalidate: 300, // 5 minutes
  }
);

/**
 * Checks if a username is available with caching
 */
export async function checkUsernameAvailability(username: string) {
  try {
    const session = await getServerSession(authOptions);
    
    // Validate username format first
    const validation = validateUsername(username);
    if (!validation.valid) {
      return { 
        success: true, 
        available: false, 
        message: validation.error || 'Invalid username format' 
      };
    }

    const isAvailable = await getCachedUsernameAvailability(username, session?.user?.id);

    return {
      success: true,
      available: isAvailable,
      message: isAvailable ? 'Username is available' : 'Username is already taken'
    };
  } catch (_error) {

    return { success: false, error: 'Failed to check username availability' };
  }
}

/**
 * Generates username suggestions (no caching needed as it's random)
 */
export async function getUsernameSuggestions(count: number = 5) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const suggestions: string[] = [];
    const maxAttempts = count * 3; // Try more times to ensure we get enough unique suggestions
    let attempts = 0;

    while (suggestions.length < count && attempts < maxAttempts) {
      const suggestion = generateUsernameFromInfo(
        session.user.name || '',
        session.user.email || ''
      );

      // Check if this suggestion is available and not already in our list
      if (!suggestions.includes(suggestion)) {
        const isAvailable = await checkUsernameAvailabilityInternal(suggestion, session.user.id);
        if (isAvailable) {
          suggestions.push(suggestion);
        }
      }
      attempts++;
    }

    // Fill remaining slots with random usernames if needed
    while (suggestions.length < count) {
      const randomSuggestion = generateRandomUsername();
      if (!suggestions.includes(randomSuggestion)) {
        const isAvailable = await checkUsernameAvailabilityInternal(randomSuggestion, session.user.id);
        if (isAvailable) {
          suggestions.push(randomSuggestion);
        }
      }
    }

    return { success: true, suggestions };
  } catch (_error) {

    return { success: false, error: 'Failed to generate suggestions' };
  }
}

/**
 * Generates a random username for the current user (no caching needed)
 */
export async function generateUserUsername() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const username = generateUsernameFromInfo(
        session.user.name || '',
        session.user.email || ''
      );

      const isAvailable = await checkUsernameAvailabilityInternal(username, session.user.id);
      if (isAvailable) {
        return { success: true, username };
      }
      attempts++;
    }

    // Fallback to random username
    const randomUsername = generateRandomUsername();
    return { success: true, username: randomUsername };
  } catch (_error) {

    return { success: false, error: 'Failed to generate username' };
  }
}

/**
 * Uploads profile picture (no caching needed for upload operations)
 */
export async function uploadProfilePicture(formData: FormData) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Upload file
    const uploadResult = await uploadImageToServer(file);
    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }

    // Update user profile with new picture URL
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        profilePicture: uploadResult.url,
        avatarType: 'UPLOAD'
      },
      select: {
        id: true,
        profilePicture: true,
        avatarType: true,
      },
    });

    // Invalidate caches
    await invalidateProfileCaches(session.user.id);

    // Revalidate profile page
    revalidatePath('/profile');

    return { success: true, user: updatedUser, url: uploadResult.url };
  } catch (_error) {

    return { success: false, error: 'Failed to upload profile picture' };
  }
}