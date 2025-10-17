'use server';

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

/**
 * Gets the current user's profile
 */
export async function getCurrentUserProfile() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
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

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user };
  } catch (_error) {

    return { success: false, error: 'Failed to get profile' };
  }
}

/**
 * Updates the user's profile
 */
export async function updateUserProfile(data: z.infer<typeof profileUpdateSchema>) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate input
    const validatedData = profileUpdateSchema.parse(data);

    // If username is provided, validate it
    if (validatedData.username) {
      const validation = validateUsername(validatedData.username);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Check if username is already taken
      const existingUser = await db.user.findFirst({
        where: {
          username: validatedData.username,
          NOT: { id: session.user.id },
        },
      });

      if (existingUser) {
        return { success: false, error: 'Username is already taken' };
      }
    }

    // Update the user
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(validatedData.username && { username: validatedData.username }),
        ...(validatedData.avatarType && { avatarType: validatedData.avatarType }),
        ...(validatedData.gravatarEmail && { gravatarEmail: validatedData.gravatarEmail }),
        ...(validatedData.profilePicture && { profilePicture: validatedData.profilePicture }),
      },
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

    revalidatePath('/profile');
    revalidatePath('/');

    return { success: true, user: updatedUser };
  } catch (_error) {

    if (_error instanceof z.ZodError) {
      return { success: false, error: 'Invalid input data' };
    }
    return { success: false, error: 'Failed to update profile' };
  }
}

/**
 * Generates a random username for the user if they don't have one
 */
export async function generateUserUsername() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { username: true, name: true, email: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.username) {
      return { success: false, error: 'User already has a username' };
    }

    let username: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      // Try to generate from name first, then fallback to random
      if (attempts < 5 && user.name) {
        username = generateUsernameFromInfo(user.name);
      } else {
        username = generateRandomUsername();
      }

      // Check if username is available
      const existingUser = await db.user.findUnique({
        where: { username },
      });

      if (!existingUser) {
        break;
      }

      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      return { success: false, error: 'Failed to generate unique username' };
    }

    // Update user with generated username
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: { username },
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

    revalidatePath('/profile');
    revalidatePath('/');

    return { success: true, user: updatedUser, username };
  } catch (_error) {

    return { success: false, error: 'Failed to generate username' };
  }
}

/**
 * Checks if a username is available
 */
export async function checkUsernameAvailability(username: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const validation = validateUsername(username);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const existingUser = await db.user.findFirst({
      where: {
        username,
        NOT: { id: session.user.id },
      },
    });

    return {
      success: true,
      available: !existingUser,
      message: existingUser ? 'Username is already taken' : 'Username is available',
    };
  } catch (_error) {

    return { success: false, error: 'Failed to check username availability' };
  }
}

/**
 * Gets username suggestions for the user
 */
export async function getUsernameSuggestions(count: number = 5) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const suggestions: string[] = [];
    let attempts = 0;
    const maxAttempts = count * 3; // Try more times to get enough suggestions

    while (suggestions.length < count && attempts < maxAttempts) {
      let username: string;
      
      // Mix name-based and random suggestions
      if (attempts < count / 2 && user.name) {
        username = generateUsernameFromInfo(user.name);
      } else {
        username = generateRandomUsername();
      }

      // Check if username is available and not already in suggestions
      if (!suggestions.includes(username)) {
        const existingUser = await db.user.findUnique({
          where: { username },
        });

        if (!existingUser) {
          suggestions.push(username);
        }
      }

      attempts++;
    }

    return { success: true, suggestions };
  } catch (_error) {

    return { success: false, error: 'Failed to get username suggestions' };
  }
}

/**
 * Updates the user's avatar type
 */
export async function updateUserAvatarType(avatarType: AvatarType, additionalData?: {
  gravatarEmail?: string;
  profilePicture?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const updateData: { avatarType: AvatarType; gravatarEmail?: string; profilePicture?: string } = { avatarType };

    if (avatarType === 'GRAVATAR' && additionalData?.gravatarEmail) {
      updateData.gravatarEmail = additionalData.gravatarEmail;
    } else if (avatarType === 'UPLOAD' && additionalData?.profilePicture) {
      updateData.profilePicture = additionalData.profilePicture;
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
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

    revalidatePath('/profile');
    revalidatePath('/');

    return { success: true, user: updatedUser };
  } catch (_error) {

    return { success: false, error: 'Failed to update avatar type' };
  }
}

/**
 * Deletes the user's uploaded profile picture
 */
export async function deleteUserProfilePicture() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        profilePicture: null,
        avatarType: 'INITIALS',
      },
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

    revalidatePath('/profile');
    revalidatePath('/');

    return { success: true, user: updatedUser };
  } catch (_error) {

    return { success: false, error: 'Failed to delete profile picture' };
  }
}

/**
 * Gets the user's profile completion status
 */
export async function getProfileCompletionStatus() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        username: true,
        
        avatarType: true,
        profilePicture: true,
        gravatarEmail: true,
      },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    let completedFields = 0;
    const totalFields = 3;

    if (user.username) completedFields++;
    
    if (user.avatarType === 'UPLOAD' && user.profilePicture) completedFields++;
    else if (user.avatarType === 'GRAVATAR' && user.gravatarEmail) completedFields++;
    else if (user.avatarType === 'INITIALS') completedFields++;

    const completionPercentage = Math.round((completedFields / totalFields) * 100);

    return {
      success: true,
      completionPercentage,
      completedFields,
      totalFields,
      isComplete: completionPercentage === 100,
      missingFields: {
        username: !user.username,
        
        avatar: user.avatarType === 'UPLOAD' && !user.profilePicture,
      },
    };
  } catch (_error) {

    return { success: false, error: 'Failed to get profile completion status' };
  }
}

/**
 * Uploads a profile picture
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

    // Upload image
    const uploadResult = await uploadImageToServer(file);
    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }

    // Update user profile
    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        profilePicture: uploadResult.url,
        avatarType: 'UPLOAD',
      },
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

    revalidatePath('/profile');
    revalidatePath('/');
    return { success: true, user: updatedUser };
  } catch {
    return { success: false, error: 'Failed to upload profile picture' };
  }
}

/**
 * Removes the user's profile picture
 */
export async function removeProfilePicture() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        profilePicture: null,
        avatarType: 'INITIALS',
      },
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

    revalidatePath('/profile');
    revalidatePath('/');
    return { success: true, user: updatedUser };
  } catch {
    return { success: false, error: 'Failed to remove profile picture' };
  }
}