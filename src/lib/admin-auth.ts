import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/generated/prisma";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logger";

export async function requireAdmin() {
  const user = await getCurrentUser();
  
  if (!user) {
    logger.warn("Unauthorized admin access attempt - no user");
    redirect("/sign-in");
  }
  
  if (user.role !== UserRole.ADMIN) {
    logger.warn("Unauthorized admin access attempt", { 
      userId: user.id, 
      role: user.role 
    });
    redirect("/dashboard");
  }
  
  logger.info("Admin access granted", { userId: user.id });
  return user;
}

export async function requireModerator() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/sign-in");
  }
  
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
    logger.warn("Unauthorized moderator access attempt", { 
      userId: user.id, 
      role: user.role 
    });
    redirect("/dashboard");
  }
  
  return user;
}

export async function isAdmin(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  
  const user = await getCurrentUser();
  return user?.id === userId && user?.role === UserRole.ADMIN;
}

export async function isModerator(userId?: string | null): Promise<boolean> {
  if (!userId) return false;
  
  const user = await getCurrentUser();
  return user?.id === userId && (user?.role === UserRole.ADMIN || user?.role === UserRole.MODERATOR);
}