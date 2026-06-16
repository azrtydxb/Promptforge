"use server";

import { requireAuth } from "@/lib/auth";
import { monitoringService } from "@/lib/monitoring";
import { db } from "@/lib/db";

/** Require an authenticated user whose platform role is ADMIN (or MODERATOR). */
async function requireAdminAccess() {
  const user = await requireAuth();
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "MODERATOR")) {
    throw new Error("Admin access required");
  }
  return user;
}

export async function getPostgreSQLMetrics() {
  await requireAdminAccess();
  
  try {
    return await monitoringService.getPostgreSQLMetrics();
  } catch (_error) {

    throw new Error("Failed to fetch PostgreSQL metrics");
  }
}

export async function getRedisMetrics() {
  await requireAdminAccess();
  
  try {
    return await monitoringService.getRedisMetrics();
  } catch (_error) {

    throw new Error("Failed to fetch Redis metrics");
  }
}

export async function getCachePerformanceMetrics() {
  await requireAdminAccess();
  
  try {
    return await monitoringService.getCachePerformanceMetrics();
  } catch (_error) {

    throw new Error("Failed to fetch cache performance metrics");
  }
}

export async function getSystemHealth() {
  await requireAdminAccess();
  
  try {
    return await monitoringService.getSystemHealth();
  } catch (_error) {

    throw new Error("Failed to fetch system health");
  }
}

export async function getAllMetrics() {
  await requireAdminAccess();
  
  try {
    const [postgresql, redis, cachePerformance, systemHealth] = await Promise.allSettled([
      monitoringService.getPostgreSQLMetrics(),
      monitoringService.getRedisMetrics(),
      monitoringService.getCachePerformanceMetrics(),
      monitoringService.getSystemHealth(),
    ]);

    return {
      postgresql: postgresql.status === 'fulfilled' ? postgresql.value : null,
      redis: redis.status === 'fulfilled' ? redis.value : null,
      cachePerformance: cachePerformance.status === 'fulfilled' ? cachePerformance.value : null,
      systemHealth: systemHealth.status === 'fulfilled' ? systemHealth.value : null,
      errors: {
        postgresql: postgresql.status === 'rejected' ? postgresql.reason?.message : null,
        redis: redis.status === 'rejected' ? redis.reason?.message : null,
        cachePerformance: cachePerformance.status === 'rejected' ? cachePerformance.reason?.message : null,
        systemHealth: systemHealth.status === 'rejected' ? systemHealth.reason?.message : null,
      }
    };
  } catch (_error) {

    throw new Error("Failed to fetch metrics");
  }
}

// Fix 2: Real prompt count (private + shared)
export async function getPromptCount(): Promise<{ total: number }> {
  await requireAdminAccess();
  try {
    const [privateCount, sharedCount] = await Promise.all([
      db.prompt.count(),
      db.sharedPrompt.count(),
    ]);
    // Private prompts already include published ones; avoid double-counting
    // by just returning the total private prompt count (each sharedPrompt is derived from a prompt)
    return { total: privateCount };
  } catch (_error) {
    throw new Error("Failed to fetch prompt count");
  }
}

// Fix 6: Update team AI settings — auth-guarded
export async function updateTeamAiSettings(
  teamId: string,
  settings: {
    defaultModel?: string;
    temperature?: number;
    maxTokens?: number;
    moderationEnabled?: boolean;
    autoTagging?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireAuth();
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "MODERATOR")) {
      return { success: false, error: "Admin access required" };
    }

    // Fetch current settings to merge
    const team = await db.team.findUnique({
      where: { id: teamId },
      select: { settings: true },
    });
    if (!team) {
      return { success: false, error: "Team not found" };
    }

    const existing = (team.settings as Record<string, unknown>) ?? {};
    const merged = { ...existing, ...settings };

    await db.team.update({
      where: { id: teamId },
      data: { settings: merged },
    });

    return { success: true };
  } catch (_error) {
    return { success: false, error: "Failed to update AI settings" };
  }
}
