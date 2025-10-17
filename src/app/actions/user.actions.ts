"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { generateRandomUsername } from "@/lib/username-generator";
import { logger } from "@/lib/logger";
import { withPerformance } from "@/lib/performance-wrapper";

interface CreateUserParams {
    name: string;
    email: string;
    image?: string;
}

export async function createUser(user: CreateUserParams) {
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
        return newUser;
    } catch (error) {
        logger.error("Error creating user", error, { email: user.email });
        throw error;
    }
}

interface UpdateUserParams {
    name?: string;
    image?: string;
}

export const updateUser = withPerformance('updateUser', async (userId: string, user: UpdateUserParams) => {
    try {
        // SECURITY: Verify the current user has permission to update this user
        const currentUser = await requireAuth();

        // Users can only update their own profile
        // Admin functionality should use admin-users.actions.ts instead
        if (currentUser.id !== userId) {
            logger.warn("Unauthorized user update attempt", {
                attemptingUserId: currentUser.id,
                targetUserId: userId
            });
            throw new Error("You can only update your own profile");
        }

        const updatedUser = await db.user.update({
            where: { id: userId },
            data: user,
        });
        revalidatePath(`/`);
        return updatedUser;
    } catch (error) {
        console.error("Error updating user:", error);
        throw error;
    }
});

export async function deleteUser(userId: string) {
    try {
        // SECURITY: This function should only be called by admins
        // Regular users should not be able to delete accounts
        // For admin usage, use admin-users.actions.ts instead

        // NOTE: User account deletion should be handled through a proper
        // account deletion flow with confirmation, data export options, etc.
        // This function is deprecated and should not be used directly.

        throw new Error("Direct user deletion is disabled for security. Use admin panel or account settings for proper deletion flow.");
    } catch (error) {
        logger.error("Error deleting user", error, { userId });
        throw error;
    }
}

export async function getUserByEmail(email: string) {
    try {
        const user = await db.user.findUnique({
            where: { email },
        });
        return user;
    } catch (error) {
        logger.error("Error getting user by email", error, { email });
        return null;
    }
}

interface ChangePasswordParams {
    currentPassword: string;
    newPassword: string;
}

export const changePassword = withPerformance('changePassword', async ({ currentPassword, newPassword }: ChangePasswordParams) => {
    let userId: string | undefined;
    try {
        const user = await requireAuth();
        userId = user.id;

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

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        logger.error("Error changing password", error, { userId });
        throw error;
    }
});