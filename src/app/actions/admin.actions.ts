"use server";

import { requireAuth } from "@/lib/auth";
import { monitoringService } from "@/lib/monitoring";

// Admin access check - you can modify this logic as needed
async function requireAdminAccess() {
  const user = await requireAuth();
  
  // For now, we'll allow any authenticated user to access admin features
  // In production, you'd want to check for admin role/permissions
  // if (!user.isAdmin) {
  //   throw new Error("Admin access required");
  // }
  
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