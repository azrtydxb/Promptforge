"use server";

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { cacheService } from '@/lib/redis';
import { ConfigCategory } from '@/generated/prisma';

/**
 * App Configuration Management
 *
 * Centralized configuration system that replaces hardcoded values
 * throughout the application. Configurations are cached for performance.
 */

export interface AppConfigValue {
  [key: string]: unknown;
}

export interface BadgeConfig {
  icon: string;
  color: string;
  darkColor?: string;
  description?: string;
}

const CONFIG_CACHE_TTL = 60 * 60; // 1 hour

/**
 * Get configuration by key
 */
export async function getConfig(key: string): Promise<AppConfigValue | null> {
  try {
    // Try cache first
    const cacheKey = `app-config:${key}`;
    const cached = await cacheService.get<AppConfigValue>(cacheKey);

    if (cached !== null) {
      return cached;
    }

    // Fetch from database
    const config = await db.appConfig.findUnique({
      where: { key, isActive: true },
    });

    if (!config) {
      return null;
    }

    const value = config.value as AppConfigValue;

    // Cache for future use
    await cacheService.set(cacheKey, value, CONFIG_CACHE_TTL);

    return value;
  } catch (error) {
    logger.error(`Failed to get config for key ${key}`, error);
    return null;
  }
}

/**
 * Get all configurations for a category
 */
export async function getConfigsByCategory(category: ConfigCategory): Promise<Record<string, AppConfigValue>> {
  try {
    // Try cache first
    const cacheKey = `app-config:category:${category}`;
    const cached = await cacheService.get<Record<string, AppConfigValue>>(cacheKey);

    if (cached !== null) {
      return cached;
    }

    // Fetch from database
    const configs = await db.appConfig.findMany({
      where: { category, isActive: true },
    });

    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = config.value as AppConfigValue;
      return acc;
    }, {} as Record<string, AppConfigValue>);

    // Cache for future use
    await cacheService.set(cacheKey, configMap, CONFIG_CACHE_TTL);

    return configMap;
  } catch (error) {
    logger.error(`Failed to get configs for category ${category}`, error);
    return {};
  }
}

/**
 * Get all badge configurations
 */
export async function getBadgeConfigs(): Promise<Record<string, BadgeConfig>> {
  try {
    const configs = await getConfigsByCategory('BADGE' as ConfigCategory);

    // Transform to BadgeConfig format
    const badgeConfigs: Record<string, BadgeConfig> = {};

    for (const [key, value] of Object.entries(configs)) {
      // Extract badge type from key (e.g., "badge.CREATOR" -> "CREATOR")
      const badgeType = key.split('.')[1];
      if (badgeType && typeof value === 'object' && value !== null) {
        badgeConfigs[badgeType] = value as unknown as BadgeConfig;
      }
    }

    return badgeConfigs;
  } catch (error) {
    logger.error('Failed to get badge configs', error);
    return {};
  }
}

/**
 * Set configuration value (admin only)
 */
export async function setConfig(
  key: string,
  category: ConfigCategory,
  value: AppConfigValue,
  description?: string
): Promise<boolean> {
  try {
    await db.appConfig.upsert({
      where: { key },
      update: {
        value: JSON.parse(JSON.stringify(value)),
        description,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        key,
        category,
        value: JSON.parse(JSON.stringify(value)),
        description,
        isActive: true,
        version: 1,
      },
    });

    // Invalidate cache
    await invalidateConfigCache(key, category);

    logger.info(`Updated config: ${key}`, { key, category });

    return true;
  } catch (error) {
    logger.error(`Failed to set config ${key}`, error);
    return false;
  }
}

/**
 * Delete configuration
 */
export async function deleteConfig(key: string): Promise<boolean> {
  try {
    const config = await db.appConfig.findUnique({
      where: { key },
    });

    if (!config) {
      return false;
    }

    await db.appConfig.delete({
      where: { key },
    });

    // Invalidate cache
    await invalidateConfigCache(key, config.category);

    logger.info(`Deleted config: ${key}`, { key });

    return true;
  } catch (error) {
    logger.error(`Failed to delete config ${key}`, error);
    return false;
  }
}

/**
 * Invalidate configuration cache
 */
export async function invalidateConfigCache(key: string, category?: ConfigCategory): Promise<void> {
  try {
    const cacheKeys = [`app-config:${key}`];

    if (category) {
      cacheKeys.push(`app-config:category:${category}`);
    }

    await Promise.all(cacheKeys.map(k => cacheService.del(k)));

    logger.info(`Invalidated config cache for key: ${key}`);
  } catch (error) {
    logger.error(`Failed to invalidate config cache for ${key}`, error);
  }
}

/**
 * Get all configurations (for admin panel)
 */
export async function getAllConfigs() {
  try {
    const configs = await db.appConfig.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' },
      ],
    });

    return configs;
  } catch (error) {
    logger.error('Failed to get all configs', error);
    return [];
  }
}

/**
 * Bulk import configurations
 */
export async function bulkImportConfigs(
  configs: Array<{
    key: string;
    category: ConfigCategory;
    value: AppConfigValue;
    description?: string;
  }>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const config of configs) {
    const result = await setConfig(
      config.key,
      config.category,
      config.value,
      config.description
    );

    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  logger.info(`Bulk import completed`, { success, failed });

  return { success, failed };
}
