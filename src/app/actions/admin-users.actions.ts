"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { UserRole } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";

interface UpdateUserParams {
  userId: string;
  updates: {
    name?: string;
    email?: string;
    role?: UserRole;
    isActive?: boolean;
  };
}

export async function getUsers(page = 1, limit = 20, search?: string) {
  await requireAdmin();
  
  try {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { username: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};
    
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
          emailVerified: true,
          _count: {
            select: {
              prompts: true,
              publishedPrompts: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);
    
    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    logger.error("Error fetching users", error);
    throw new Error("Failed to fetch users");
  }
}

export async function updateUser({ userId, updates }: UpdateUserParams) {
  const admin = await requireAdmin();
  
  try {
    // Prevent admin from removing their own admin role
    if (userId === admin.id && updates.role && updates.role !== UserRole.ADMIN) {
      throw new Error("Cannot remove your own admin privileges");
    }
    
    const user = await db.user.update({
      where: { id: userId },
      data: updates,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
      },
    });
    
    logger.info("User updated by admin", { 
      adminId: admin.id, 
      userId, 
      updates 
    });
    
    revalidatePath("/admin");
    return { success: true, user };
  } catch (error) {
    logger.error("Error updating user", error, { userId, updates });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update user" 
    };
  }
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  
  try {
    // Prevent admin from deleting themselves
    if (userId === admin.id) {
      throw new Error("Cannot delete your own account");
    }
    
    await db.user.delete({
      where: { id: userId },
    });
    
    logger.info("User deleted by admin", { 
      adminId: admin.id, 
      userId 
    });
    
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    logger.error("Error deleting user", error, { userId });
    return { 
      success: false, 
      error: "Failed to delete user" 
    };
  }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const admin = await requireAdmin();
  
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    
    logger.info("User password reset by admin", { 
      adminId: admin.id, 
      userId 
    });
    
    return { success: true };
  } catch (error) {
    logger.error("Error resetting user password", error, { userId });
    return { 
      success: false, 
      error: "Failed to reset password" 
    };
  }
}

export async function getUserStats() {
  await requireAdmin();
  
  try {
    const [
      totalUsers,
      activeUsers,
      adminCount,
      moderatorCount,
      verifiedUsers,
      newUsersThisMonth,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { isActive: true } }),
      db.user.count({ where: { role: UserRole.ADMIN } }),
      db.user.count({ where: { role: UserRole.MODERATOR } }),
      db.user.count({ where: { emailVerified: { not: null } } }),
      db.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ]);
    
    return {
      totalUsers,
      activeUsers,
      adminCount,
      moderatorCount,
      verifiedUsers,
      newUsersThisMonth,
    };
  } catch (error) {
    logger.error("Error fetching user stats", error);
    throw new Error("Failed to fetch user statistics");
  }
}