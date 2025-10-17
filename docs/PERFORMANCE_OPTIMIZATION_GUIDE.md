# Performance Optimization Guide for PromptForge

This guide covers all the performance optimizations implemented in PromptForge, including caching strategies, database optimizations, and best practices.

## Table of Contents

1. [Database Optimizations](#database-optimizations)
2. [Caching Strategies](#caching-strategies)
3. [Client-Side Optimizations](#client-side-optimizations)
4. [Performance Monitoring](#performance-monitoring)
5. [Zod Validation Enhancements](#zod-validation-enhancements)
6. [Bundle Optimization](#bundle-optimization)
7. [Testing and Benchmarking](#testing-and-benchmarking)
8. [Best Practices](#best-practices)

## Database Optimizations

### Connection Pooling

Database connections are managed through a connection pool to improve performance:

```typescript
// src/lib/db.ts
const prismaConfig = {
  __internal: {
    engine: {
      connectionLimit: 10,
      poolTimeout: 10000,
      connectTimeout: 10000,
    },
  },
};
```

### Composite Indexes

We've added composite indexes to optimize common query patterns:

```prisma
model Prompt {
  // ... existing fields
  @@index([userId, folderId, createdAt]) // For folder queries
  @@index([isPublished, publishedAt, likeCount]) // For marketplace sorting
  @@index([status, publishedAt]) // For moderation queries
  @@index([visibility, isPublished, publishedAt]) // For public content filtering
}
```

### Query Optimization

All database queries are wrapped with performance monitoring:

```typescript
// Use optimized select to avoid N+1 queries
const prompts = await db.prompt.findMany({
  select: {
    id: true,
    title: true,
    tags: { select: { id: true, name: true } },
    _count: { select: { likes: true, favorites: true } },
  },
});
```

## Caching Strategies

### Multi-Level Caching

We implement a 3-level caching strategy:

1. **L1 Cache**: Redis (fastest)
2. **L2 Cache**: Redis with longer TTL (fallback)
3. **L3 Cache**: Database (source of truth)

```typescript
// src/lib/cache-strategies.ts
export class CacheHierarchy {
  static async getWithFallback<T>(
    key: string,
    l1TTL: number,
    l2TTL: number,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    // Try L1, then L2, then fetch from source
  }
}
```

### Cache Versioning

Instead of expensive SCAN operations, we use version-based cache invalidation:

```typescript
// Pattern: {group}:v{version}:{key-parts}
// Example: shared-prompts:v3:page:1:limit:12
```

### Cache Warming

Popular content is pre-warmed to improve first-load performance:

```typescript
// src/lib/cache-strategies.ts
export class CacheWarmer {
  static async warmPopularContent() {
    await Promise.all([
      this.cacheTrendingPrompts(),
      this.cachePopularTags(),
      this.cacheFeaturedPrompts(),
    ]);
  }
}
```

### TTL Strategies

Different data types have different TTL values:

```typescript
// src/lib/redis.ts
export const cacheTTL = {
  // Short-term (5-15 minutes)
  searchResults: 60 * 5, // 5 minutes
  sharedPrompts: 60 * 10, // 10 minutes
  
  // Medium-term (15-60 minutes)
  dashboardAnalytics: 60 * 15, // 15 minutes
  trendingPrompts: 60 * 20, // 20 minutes
  
  // Long-term (1-24 hours)
  userProfile: 60 * 60, // 1 hour
  featuredPrompts: 60 * 60 * 6, // 6 hours
};
```

## Client-Side Optimizations

### React Query Integration

Client-side caching is handled by React Query with Redis integration:

```typescript
// src/lib/query-client.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
    },
  },
});
```

### Optimistic Updates

UI updates are optimistic for better user experience:

```typescript
// src/lib/query-client.ts
export function createOptimisticUpdate<T>(
  queryKey: string[],
  updateFn: (oldData: T | undefined) => T,
  rollbackFn: (oldData: T | undefined) => T
) {
  return {
    onMutate: async (newData: T) => {
      // Optimistically update
      queryClient.setQueryData(queryKey, updateFn);
    },
    onError: (err, newData, context) => {
      // Rollback on error
      queryClient.setQueryData(queryKey, rollbackFn);
    },
  };
}
```

## Performance Monitoring

### Automatic Monitoring

All operations are automatically monitored:

```typescript
// src/lib/performance.ts
export class PerformanceMonitor {
  static async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      this.recordMetric(name, performance.now() - start);
      return result;
    } catch (error) {
      this.recordMetric(`${name}:error`, performance.now() - start);
      throw error;
    }
  }
}
```

### Health Checks

Regular health checks for database and Redis:

```typescript
// src/lib/db.ts
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed', error);
    return false;
  }
}
```

### Performance Reports

Automated performance reports are generated:

```typescript
// src/lib/performance.ts
export class PerformanceReporter {
  static generateReport() {
    return {
      summary: PerformanceMonitor.getMetrics(),
      slowOperations: this.identifySlowOperations(),
      errors: this.getErrorMetrics(),
    };
  }
}
```

## Zod Validation Enhancements

### Centralized Schemas

All validation schemas are centralized:

```typescript
// src/lib/schemas/index.ts
export const promptSchemas = {
  create: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    // ...
  }),
  update: z.object({
    // ...
  }),
};
```

### Validation Middleware

Reusable validation middleware for API routes:

```typescript
// src/lib/validation-middleware.ts
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (data: T, request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const body = await request.json();
      const validatedData = schema.parse(body);
      return await handler(validatedData, request);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        }, { status: 400 });
      }
    }
  };
}
```

### Error Handling

Comprehensive error handling for validation failures:

```typescript
// src/lib/validation-middleware.ts
export class ValidationError extends Error {
  constructor(
    message: string,
    public details: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

## Bundle Optimization

### Next.js Configuration

Optimized Next.js configuration for better performance:

```typescript
// next.config.optimized.ts
export default {
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      'date-fns',
    ],
    scrollRestoration: true,
    optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
};
```

### Code Splitting

Automatic code splitting with optimized chunks:

```typescript
// next.config.optimized.ts
webpack: (config) => {
  config.optimization.splitChunks = {
    chunks: 'all',
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: -10,
        chunks: 'all',
      },
      ui: {
        test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
        name: 'ui',
        priority: 20,
        chunks: 'all',
      },
    },
  };
}
```

## Testing and Benchmarking

### Performance Tests

Comprehensive performance test suite:

```typescript
// src/__tests__/performance/performance.test.ts
describe('Performance Tests', () => {
  it('should cache and retrieve data within acceptable time', async () => {
    const setDuration = await PerformanceMonitor.measureSync('cache.set', () => {
      return cacheService.set(key, data, 60);
    });
    expect(setDuration).toBeLessThan(50); // 50ms threshold
  });
});
```

### Load Testing

Built-in load testing capabilities:

```typescript
// src/__tests__/performance/performance.test.ts
it('should handle high concurrent load', async () => {
  const concurrentUsers = 50;
  const operationsPerUser = 10;
  
  // Test concurrent operations
  await Promise.all(
    Array.from({ length: concurrentUsers }, async (_, userIndex) => {
      // Perform operations
    })
  );
});
```

## Best Practices

### Database Best Practices

1. **Use Select Statements**: Always specify fields needed
2. **Batch Operations**: Use transactions for multiple writes
3. **Index Optimization**: Add composite indexes for common queries
4. **Connection Pooling**: Reuse database connections

### Caching Best Practices

1. **Cache Hierarchy**: Implement multi-level caching
2. **TTL Strategy**: Set appropriate TTL based on data volatility
3. **Cache Warming**: Pre-warm popular content
4. **Version-based Invalidation**: Use versioning instead of pattern deletion

### Frontend Best Practices

1. **Optimistic Updates**: Update UI immediately
2. **Error Boundaries**: Handle errors gracefully
3. **Code Splitting**: Split code by routes and features
4. **Image Optimization**: Use modern formats and lazy loading

### Monitoring Best Practices

1. **Track Everything**: Monitor all database and cache operations
2. **Set Thresholds**: Define acceptable performance thresholds
3. **Alert on Issues**: Set up alerts for performance degradation
4. **Regular Reports**: Generate regular performance reports

## Implementation Checklist

- [ ] Update database indexes
- [ ] Implement connection pooling
- [ ] Set up Redis caching with versioning
- [ ] Configure cache warming
- [ ] Implement React Query
- [ ] Add performance monitoring
- [ ] Set up validation middleware
- [ ] Optimize Next.js configuration
- [ ] Run performance tests
- [ ] Set up monitoring alerts

## Performance Targets

### Database Queries
- Simple queries: < 50ms
- Complex queries: < 200ms
- Indexed queries: < 20ms

### Cache Operations
- Set operations: < 10ms
- Get operations: < 5ms
- Batch operations: < 100ms for 100 items

### API Response Times
- 95th percentile: < 500ms
- 99th percentile: < 1000ms
- Error rate: < 0.1%

### Frontend Performance
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- First Input Delay: < 100ms

## Troubleshooting

### Common Issues

1. **Slow Queries**: Check indexes and query patterns
2. **Cache Misses**: Verify cache keys and TTL settings
3. **Memory Leaks**: Monitor memory usage during operations
4. **Bundle Size**: Use bundle analyzer to identify large chunks

### Debugging Tools

1. **Performance Monitor**: Built-in performance tracking
2. **Query Logs**: Database query logging
3. **Cache Analytics**: Redis monitoring
4. **Bundle Analyzer**: Webpack bundle analysis

## Future Enhancements

1. **CDN Integration**: Implement CDN for static assets
2. **Edge Caching**: Use edge locations for caching
3. **Database Sharding**: Scale database horizontally
4. **Real-time Updates**: Implement WebSocket for real-time features
5. **Advanced Monitoring**: Add APM tools integration