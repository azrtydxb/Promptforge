import { QueryClient } from '@tanstack/react-query';
import { cacheService } from '@/lib/redis';
import { logger } from '@/lib/logger';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // Enable background refetching
      refetchInterval: false,
      // Error handling
      throwOnError: false,
      // Network mode
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

// Enhanced query hook with Redis integration
export function createOptimizedQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: {
    staleTime?: number;
    cacheTime?: number;
    enableRedisCache?: boolean;
    redisTTL?: number;
    refetchInterval?: number;
  } = {}
) {
  const { 
    enableRedisCache = false, 
    redisTTL = 300, 
    staleTime,
    cacheTime,
    refetchInterval
  } = options;
  
  return {
    queryKey,
    queryFn: async () => {
      if (enableRedisCache) {
        const cacheKey = queryKey.join(':');
        
        try {
          // Try Redis first
          const cached = await cacheService.get<T>(cacheKey);
          if (cached) {
            logger.debug(`Cache hit for key: ${cacheKey}`);
            return cached;
          }
        } catch (error) {
          logger.warn('Redis cache fetch failed', { error, cacheKey });
        }
        
        // Fetch from server
        try {
          const data = await queryFn();
          
          // Store in Redis
          try {
            await cacheService.set(cacheKey, data, redisTTL);
            logger.debug(`Cached data for key: ${cacheKey}`);
          } catch (error) {
            logger.warn('Redis cache set failed', { error, cacheKey });
          }
          
          return data;
        } catch (error) {
          logger.error('Query fetch failed', { error, queryKey });
          throw error;
        }
      }
      
      return queryFn();
    },
    staleTime: staleTime || 5 * 60 * 1000,
    cacheTime: cacheTime || 10 * 60 * 1000,
    refetchInterval,
  };
}

// Prefetching utility
export function prefetchQuery<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options: {
    staleTime?: number;
    enableRedisCache?: boolean;
    redisTTL?: number;
  } = {}
) {
  const optimizedQuery = createOptimizedQuery(queryKey, queryFn, options);
  return queryClient.prefetchQuery(optimizedQuery);
}

// Invalidate and refetch utility
export function invalidateAndRefetch(queryKey: string[]) {
  return queryClient.invalidateQueries({ queryKey });
}

// Optimistic update helper
export function createOptimisticUpdate<T>(
  queryKey: string[],
  updateFn: (oldData: T | undefined) => T,
  rollbackFn: (oldData: T | undefined) => T
) {
  return {
    onMutate: async (newData: T) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData<T>(queryKey);
      
      // Optimistically update to the new value
      queryClient.setQueryData<T>(queryKey, updateFn(previousData));
      
      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err: any, newData: T, context: any) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData<T>(queryKey, rollbackFn(context.previousData));
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey });
    },
  };
}

// Infinite query helper for pagination
export function createInfiniteQuery<T>(
  queryKey: string[],
  fetchFn: ({ pageParam }: { pageParam: number }) => Promise<{
    data: T[];
    nextPage?: number;
    hasMore: boolean;
  }>,
  options: {
    staleTime?: number;
    cacheTime?: number;
    enableRedisCache?: boolean;
    redisTTL?: number;
  } = {}
) {
  return {
    queryKey,
    queryFn: fetchFn,
    getNextPageParam: (lastPage: any) => lastPage.nextPage,
    staleTime: options.staleTime || 5 * 60 * 1000,
    cacheTime: options.cacheTime || 10 * 60 * 1000,
  };
}

// Query health monitoring
export class QueryHealthMonitor {
  private static queryMetrics = new Map<string, { count: number; errors: number; avgDuration: number }>();
  
  static trackQuery(queryKey: string[], duration: number, success: boolean) {
    const key = queryKey.join('.');
    const current = this.queryMetrics.get(key) || { count: 0, errors: 0, avgDuration: 0 };
    
    current.count++;
    if (!success) current.errors++;
    current.avgDuration = (current.avgDuration * (current.count - 1) + duration) / current.count;
    
    this.queryMetrics.set(key, current);
    
    // Log unhealthy queries
    const errorRate = current.errors / current.count;
    if (errorRate > 0.1 || current.avgDuration > 5000) {
      logger.warn('Unhealthy query detected', {
        queryKey: key,
        errorRate,
        avgDuration: current.avgDuration,
        count: current.count,
      });
    }
  }
  
  static getMetrics() {
    return Object.fromEntries(this.queryMetrics);
  }
  
  static resetMetrics() {
    this.queryMetrics.clear();
  }
}

// Export utilities
export const queryUtils = {
  createOptimizedQuery,
  prefetchQuery,
  invalidateAndRefetch,
  createOptimisticUpdate,
  createInfiniteQuery,
  healthMonitor: QueryHealthMonitor,
};

// Default query configurations for common patterns
export const queryConfigs = {
  // User data - changes infrequently
  user: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    enableRedisCache: true,
    redisTTL: 1800, // 30 minutes
  },
  
  // Prompts - changes moderately
  prompts: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    enableRedisCache: true,
    redisTTL: 600, // 10 minutes
  },
  
  // Search results - change frequently
  search: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
    enableRedisCache: true,
    redisTTL: 300, // 5 minutes
  },
  
  // Analytics - can be stale
  analytics: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    enableRedisCache: true,
    redisTTL: 3600, // 1 hour
  },
  
  // Real-time data - no caching
  realtime: {
    staleTime: 0,
    cacheTime: 0,
    enableRedisCache: false,
    refetchInterval: 30 * 1000, // 30 seconds
  },
};