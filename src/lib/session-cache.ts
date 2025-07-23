import { Session } from 'next-auth';
import { cacheService, cacheKeys, cacheTTL } from '@/lib/redis';
import { logger } from '@/lib/logger';

// Types for cached session data
interface CachedSession extends Session {
  userId: string;
  lastAccessed: number;
}

interface UserSessionData {
  session?: CachedSession;
  preferences?: Record<string, unknown>;
  recentActivity?: Array<{
    action: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }>;
}

/**
 * Session Cache Service
 * Provides caching for user sessions and related data
 */
export class SessionCacheService {
  /**
   * Cache a user session
   */
  static async cacheSession(session: Session): Promise<void> {
    if (!session.user?.id) return;

    const cachedSession: CachedSession = {
      ...session,
      userId: session.user.id,
      lastAccessed: Date.now(),
    };

    const cacheKey = cacheKeys.session(session.user.id);
    
    try {
      await cacheService.set(
        cacheKey,
        cachedSession,
        cacheTTL.userProfile // 1 hour TTL for sessions
      );
    } catch (error) {
      logger.error('Failed to cache session', error, { userId: session.user.id });
    }
  }

  /**
   * Get cached session
   */
  static async getCachedSession(userId: string): Promise<CachedSession | null> {
    const cacheKey = cacheKeys.session(userId);
    
    try {
      const cached = await cacheService.get<CachedSession>(cacheKey);
      
      if (cached) {
        // Update last accessed time
        cached.lastAccessed = Date.now();
        await cacheService.set(cacheKey, cached, cacheTTL.userProfile);
      }
      
      return cached;
    } catch (error) {
      logger.error('Failed to get cached session', error, { userId });
      return null;
    }
  }

  /**
   * Invalidate session cache
   */
  static async invalidateSession(userId: string): Promise<void> {
    const cacheKey = cacheKeys.session(userId);
    
    try {
      await cacheService.del(cacheKey);
    } catch (error) {
      logger.error('Failed to invalidate session cache', error, { userId });
    }
  }

  /**
   * Cache user session data (preferences, recent activity, etc.)
   */
  static async cacheUserSessionData(
    userId: string, 
    data: Partial<UserSessionData>
  ): Promise<void> {
    const cacheKey = cacheKeys.userSession(userId);
    
    try {
      // Get existing data
      const existing = await cacheService.get<UserSessionData>(cacheKey) || {};
      
      // Merge with new data
      const updated: UserSessionData = {
        ...existing,
        ...data,
      };

      await cacheService.set(
        cacheKey,
        updated,
        cacheTTL.userProfile
      );
    } catch (error) {
      logger.error('Failed to cache user session data', error, { userId });
    }
  }

  /**
   * Get cached user session data
   */
  static async getUserSessionData(userId: string): Promise<UserSessionData | null> {
    const cacheKey = cacheKeys.userSession(userId);
    
    try {
      return await cacheService.get<UserSessionData>(cacheKey);
    } catch (error) {
      logger.error('Failed to get user session data', error, { userId });
      return null;
    }
  }

  /**
   * Add user activity to cache
   */
  static async addUserActivity(
    userId: string,
    action: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      const sessionData = await this.getUserSessionData(userId) || {};
      const recentActivity = sessionData.recentActivity || [];
      
      // Add new activity
      recentActivity.unshift({
        action,
        timestamp: Date.now(),
        metadata,
      });
      
      // Keep only last 50 activities
      const trimmedActivity = recentActivity.slice(0, 50);
      
      await this.cacheUserSessionData(userId, {
        ...sessionData,
        recentActivity: trimmedActivity,
      });
    } catch (error) {
      logger.error('Failed to add user activity', error, { userId, action });
    }
  }

  /**
   * Cache user preferences
   */
  static async cacheUserPreferences(
    userId: string,
    preferences: Record<string, unknown>
  ): Promise<void> {
    try {
      const sessionData = await this.getUserSessionData(userId) || {};
      
      await this.cacheUserSessionData(userId, {
        ...sessionData,
        preferences,
      });
    } catch (error) {
      logger.error('Failed to cache user preferences', error, { userId });
    }
  }

  /**
   * Get user preferences from cache
   */
  static async getUserPreferences(userId: string): Promise<Record<string, unknown> | null> {
    try {
      const sessionData = await this.getUserSessionData(userId);
      return sessionData?.preferences || null;
    } catch (error) {
      logger.error('Failed to get user preferences', error, { userId });
      return null;
    }
  }

  /**
   * Cache frequently accessed user data
   */
  static async cacheUserProfile(userId: string, profile: Record<string, unknown>): Promise<void> {
    const cacheKey = cacheKeys.userProfile(userId);
    
    try {
      await cacheService.set(
        cacheKey,
        profile,
        cacheTTL.userProfile
      );
    } catch (error) {
      logger.error('Failed to cache user profile', error, { userId });
    }
  }

  /**
   * Get cached user profile
   */
  static async getCachedUserProfile(userId: string): Promise<Record<string, unknown> | null> {
    const cacheKey = cacheKeys.userProfile(userId);
    
    try {
      return await cacheService.get<Record<string, unknown>>(cacheKey);
    } catch (error) {
      logger.error('Failed to get cached user profile', error, { userId });
      return null;
    }
  }

  /**
   * Invalidate all user-related cache
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    const keys = [
      cacheKeys.session(userId),
      cacheKeys.userSession(userId),
      cacheKeys.userProfile(userId),
    ];
    
    try {
      await Promise.all(keys.map(key => cacheService.del(key)));
    } catch (error) {
      logger.error('Failed to invalidate user cache', error, { userId });
    }
  }

  /**
   * Get active sessions count (for analytics)
   */
  static async getActiveSessionsCount(): Promise<number> {
    const cacheKey = cacheKeys.globalAnalytics();
    
    try {
      const cached = await cacheService.get<number>(cacheKey);
      if (cached !== null) return cached;
      
      // This would need to be implemented based on your session storage
      // For now, return 0 as placeholder
      const count = 0;
      
      await cacheService.set(
        cacheKey,
        count,
        cacheTTL.dashboardAnalytics // 5 minutes
      );
      
      return count;
    } catch (error) {
      logger.error('Failed to get active sessions count', error);
      return 0;
    }
  }

  /**
   * Cache session-based rate limiting
   */
  static async checkSessionRateLimit(
    userId: string,
    action: string,
    limit: number,
    windowMs: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const cacheKey = cacheKeys.rateLimit(`${userId}:${action}`, 'session');
    
    try {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      // Get current requests in window
      const requests = await cacheService.get<number[]>(cacheKey) || [];
      
      // Filter requests within current window
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      
      const allowed = validRequests.length < limit;
      const remaining = Math.max(0, limit - validRequests.length);
      const resetTime = validRequests.length > 0 ? 
        Math.min(...validRequests) + windowMs : 
        now + windowMs;
      
      if (allowed) {
        // Add current request
        validRequests.push(now);
        await cacheService.set(
          cacheKey,
          validRequests,
          Math.ceil(windowMs / 1000) // TTL in seconds
        );
      }
      
      return { allowed, remaining, resetTime };
    } catch (error) {
      logger.error('Failed to check session rate limit', error, { userId, action });
      // Allow request on error
      return { allowed: true, remaining: limit - 1, resetTime: Date.now() + windowMs };
    }
  }
}

// Helper functions for easy integration
export const sessionCache = {
  cache: SessionCacheService.cacheSession,
  get: SessionCacheService.getCachedSession,
  invalidate: SessionCacheService.invalidateSession,
  addActivity: SessionCacheService.addUserActivity,
  cachePreferences: SessionCacheService.cacheUserPreferences,
  getPreferences: SessionCacheService.getUserPreferences,
  cacheProfile: SessionCacheService.cacheUserProfile,
  getProfile: SessionCacheService.getCachedUserProfile,
  invalidateUser: SessionCacheService.invalidateUserCache,
  checkRateLimit: SessionCacheService.checkSessionRateLimit,
};