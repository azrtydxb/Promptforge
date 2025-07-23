"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { generateRandomUsername } from "@/lib/username-generator";
import { logger } from "@/lib/logger";

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

export async function updateUser(userId: string, user: UpdateUserParams) {
    try {
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
}

export async function deleteUser(userId: string) {
    try {
        const deletedUser = await db.user.delete({
            where: { id: userId },
        });
        revalidatePath(`/`);
        return deletedUser;
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

export async function changePassword({ currentPassword, newPassword }: ChangePasswordParams) {
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
}