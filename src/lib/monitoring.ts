import { db } from "@/lib/db";
import { getRedisClient } from "@/lib/redis";
import { logger } from "@/lib/logger";

export interface PostgreSQLMetrics {
  connectionCount: number;
  activeQueries: number;
  slowQueries: Array<{
    query: string;
    duration: number;
    calls: number;
    meanTime: number;
  }>;
  databaseSize: number;
  tableStats: Array<{
    tableName: string;
    rowCount: number;
    size: string;
    indexSize: string;
  }>;
  lockStats: Array<{
    lockType: string;
    count: number;
  }>;
  cacheHitRatio: number;
}

export interface RedisMetrics {
  info: {
    version: string;
    uptime: number;
    connectedClients: number;
    usedMemory: number;
    usedMemoryHuman: string;
    totalCommandsProcessed: number;
    instantaneousOpsPerSec: number;
    keyspaceHits: number;
    keyspaceMisses: number;
    evictedKeys: number;
  };
  keyStats: {
    totalKeys: number;
    keysByType: Record<string, number>;
    keysByPattern: Array<{
      pattern: string;
      count: number;
      memory: number;
    }>;
  };
  performance: {
    hitRate: number;
    avgTtl: number;
    memoryEfficiency: number;
  };
}

export interface CachePerformanceMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  avgResponseTime: number;
  topMissedKeys: Array<{
    key: string;
    misses: number;
  }>;
  topHitKeys: Array<{
    key: string;
    hits: number;
  }>;
}

export class MonitoringService {
  async getPostgreSQLMetrics(): Promise<PostgreSQLMetrics> {
    // Initialize with safe defaults
    let connectionCount = 0;
    let activeQueries = 0;
    let slowQueries: Array<{
      query: string;
      duration: number;
      calls: number;
      meanTime: number;
    }> = [];
    let databaseSize = 0;
    let tableStats: Array<{
      tableName: string;
      rowCount: number;
      size: string;
      indexSize: string;
    }> = [];
    let lockStats: Array<{
      lockType: string;
      count: number;
    }> = [];
    let cacheHitRatio = 0;

    try {
      // Basic database connectivity test
      await db.$queryRaw`SELECT 1`;
      
      // Get basic metrics with error handling for each query
      try {
        const connectionResult = await db.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active';
        `;
        connectionCount = Number(connectionResult[0]?.count || 0);
      } catch (error) {
        logger.warn('Could not get connection count', { error });
      }

      try {
        const activeQueriesResult = await db.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*) as count FROM pg_stat_activity
          WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%';
        `;
        activeQueries = Number(activeQueriesResult[0]?.count || 0);
      } catch (error) {
        logger.warn('Could not get active queries count', { error });
      }

      try {
        const dbSizeResult = await db.$queryRaw<Array<{ size: bigint }>>`
          SELECT pg_database_size(current_database()) as size;
        `;
        databaseSize = Number(dbSizeResult[0]?.size || 0);
      } catch (error) {
        logger.warn('Could not get database size', { error });
      }

      // Try to get table statistics (might fail if pg_stat_user_tables is not accessible)
      try {
        const tableStatsResult = await db.$queryRaw<Array<{
          table_name: string;
          row_count: bigint;
          table_size: string;
          index_size: string;
        }>>`
          SELECT
            schemaname||'.'||relname as table_name,
            COALESCE(n_tup_ins + n_tup_upd + n_tup_del, 0) as row_count,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as table_size,
            pg_size_pretty(pg_indexes_size(schemaname||'.'||relname)) as index_size
          FROM pg_stat_user_tables
          ORDER BY pg_total_relation_size(schemaname||'.'||relname) DESC
          LIMIT 5;
        `;

        tableStats = tableStatsResult.map(row => ({
          tableName: row.table_name,
          rowCount: Number(row.row_count),
          size: row.table_size,
          indexSize: row.index_size,
        }));
      } catch (error) {
        logger.warn('Could not get table statistics', { error });
      }

      // Try to get lock statistics (might fail in some environments)
      try {
        const lockStatsResult = await db.$queryRaw<Array<{
          lock_type: string;
          count: bigint;
        }>>`
          SELECT mode as lock_type, count(*) as count
          FROM pg_locks
          GROUP BY mode
          ORDER BY count DESC
          LIMIT 5;
        `;

        lockStats = lockStatsResult.map(row => ({
          lockType: row.lock_type,
          count: Number(row.count),
        }));
      } catch (error) {
        logger.warn('Could not get lock statistics', { error });
      }

      // Try to get cache hit ratio (might fail if pg_statio_user_tables is not accessible)
      try {
        const cacheHitResult = await db.$queryRaw<Array<{
          hit_ratio: number;
        }>>`
          SELECT
            COALESCE(
              round(
                (sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0)) * 100, 2
              ), 0
            ) as hit_ratio
          FROM pg_statio_user_tables;
        `;
        cacheHitRatio = Number(cacheHitResult[0]?.hit_ratio || 0);
      } catch (error) {
        logger.warn('Could not get cache hit ratio', { error });
      }

      // Try to get slow queries (requires pg_stat_statements extension)
      try {
        const slowQueriesResult = await db.$queryRaw<Array<{
          query: string;
          total_exec_time: number;
          calls: bigint;
          mean_exec_time: number;
        }>>`
          SELECT
            query,
            total_exec_time as total_exec_time,
            calls,
            mean_exec_time
          FROM pg_stat_statements
          ORDER BY mean_exec_time DESC
          LIMIT 5;
        `;

        slowQueries = slowQueriesResult.map(row => ({
          query: row.query.substring(0, 100) + (row.query.length > 100 ? '...' : ''),
          duration: row.total_exec_time,
          calls: Number(row.calls),
          meanTime: row.mean_exec_time,
        }));
      } catch (error) {
        logger.warn('pg_stat_statements extension not available', { error });
      }

      return {
        connectionCount,
        activeQueries,
        slowQueries,
        databaseSize,
        tableStats,
        lockStats,
        cacheHitRatio,
      };
    } catch (error) {
      logger.error('Error getting PostgreSQL metrics', error);
      // Return safe defaults instead of throwing
      return {
        connectionCount: 0,
        activeQueries: 0,
        slowQueries: [],
        databaseSize: 0,
        tableStats: [],
        lockStats: [],
        cacheHitRatio: 0,
      };
    }
  }

  async getRedisMetrics(): Promise<RedisMetrics> {
    try {
      const redis = getRedisClient();
      
      // Check if Redis is connected
      if (redis.status !== 'ready') {
        logger.warn('Redis client not ready', { status: redis.status });
        return {
          info: {
            version: 'unknown',
            uptime: 0,
            connectedClients: 0,
            usedMemory: 0,
            usedMemoryHuman: '0B',
            totalCommandsProcessed: 0,
            instantaneousOpsPerSec: 0,
            keyspaceHits: 0,
            keyspaceMisses: 0,
            evictedKeys: 0,
          },
          keyStats: {
            totalKeys: 0,
            keysByType: {},
            keysByPattern: [],
          },
          performance: {
            hitRate: 0,
            avgTtl: 0,
            memoryEfficiency: 0,
          },
        };
      }
      
      // Get Redis INFO
      const info = await redis.info();
      const infoLines = info.split('\r\n');
      const infoObj: Record<string, string> = {};
      
      infoLines.forEach((line: string) => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          infoObj[key] = value;
        }
      });

      // Get keyspace info
      const keyspaceInfo = await redis.info('keyspace');
      let totalKeys = 0;
      const keysByDb: Record<string, number> = {};

      keyspaceInfo.split('\r\n').forEach((line: string) => {
        if (line.startsWith('db')) {
          const match = line.match(/keys=(\d+)/);
          if (match) {
            const keys = parseInt(match[1]);
            totalKeys += keys;
            keysByDb[line.split(':')[0]] = keys;
          }
        }
      });

      // Get key patterns analysis
      const keyPatterns: Array<{
        pattern: string;
        count: number;
        memory: number;
      }> = [];

      try {
        const allKeys = await redis.keys('*');
        const patternMap: Record<string, number> = {};
        
        allKeys.forEach((key: string) => {
          const pattern = key.split(':')[0] + ':*';
          patternMap[pattern] = (patternMap[pattern] || 0) + 1;
        });

        for (const [pattern, count] of Object.entries(patternMap)) {
          const sampleKey = allKeys.find((key: string) => key.startsWith(pattern.replace(':*', ':')));
          let memory = 0;
          if (sampleKey) {
            try {
              const memoryUsage = await redis.memory('USAGE', sampleKey);
              memory = (memoryUsage || 0) * count;
            } catch {
              // Memory command might not be available in all Redis versions
              memory = 0;
            }
          }
          
          keyPatterns.push({ pattern, count, memory });
        }
      } catch (error) {
        logger.warn('Could not analyze key patterns', { error });
      }

      // Calculate performance metrics
      const keyspaceHits = parseInt(infoObj.keyspace_hits || '0');
      const keyspaceMisses = parseInt(infoObj.keyspace_misses || '0');
      const hitRate = keyspaceHits + keyspaceMisses > 0 
        ? (keyspaceHits / (keyspaceHits + keyspaceMisses)) * 100 
        : 0;

      const usedMemory = parseInt(infoObj.used_memory || '0');
      const maxMemory = parseInt(infoObj.maxmemory || '0');
      const memoryEfficiency = maxMemory > 0 ? (usedMemory / maxMemory) * 100 : 0;

      return {
        info: {
          version: infoObj.redis_version || 'unknown',
          uptime: parseInt(infoObj.uptime_in_seconds || '0'),
          connectedClients: parseInt(infoObj.connected_clients || '0'),
          usedMemory: usedMemory,
          usedMemoryHuman: infoObj.used_memory_human || '0B',
          totalCommandsProcessed: parseInt(infoObj.total_commands_processed || '0'),
          instantaneousOpsPerSec: parseInt(infoObj.instantaneous_ops_per_sec || '0'),
          keyspaceHits: keyspaceHits,
          keyspaceMisses: keyspaceMisses,
          evictedKeys: parseInt(infoObj.evicted_keys || '0'),
        },
        keyStats: {
          totalKeys,
          keysByType: keysByDb,
          keysByPattern: keyPatterns.sort((a, b) => b.count - a.count).slice(0, 10),
        },
        performance: {
          hitRate,
          avgTtl: 0, // Would need to calculate from individual keys
          memoryEfficiency,
        },
      };
    } catch (error) {
      logger.error('Error getting Redis metrics', error);
      throw error;
    }
  }

  async getCachePerformanceMetrics(): Promise<CachePerformanceMetrics> {
    try {
      const redisMetrics = await this.getRedisMetrics();
      const { keyspaceHits, keyspaceMisses } = redisMetrics.info;
      
      const totalRequests = keyspaceHits + keyspaceMisses;
      const hitRate = totalRequests > 0 ? (keyspaceHits / totalRequests) * 100 : 0;
      const missRate = 100 - hitRate;

      // For now, return basic metrics. In a production environment,
      // you'd want to track these metrics over time in a separate store
      return {
        hitRate,
        missRate,
        totalRequests,
        avgResponseTime: 0, // Would need to track this separately
        topMissedKeys: [], // Would need to track this separately
        topHitKeys: [], // Would need to track this separately
      };
    } catch (error) {
      logger.error('Error getting cache performance metrics', error);
      throw error;
    }
  }

  async getSystemHealth(): Promise<{
    postgres: { status: 'healthy' | 'unhealthy'; latency: number };
    redis: { status: 'healthy' | 'unhealthy'; latency: number };
  }> {
    const results: {
      postgres: { status: 'healthy' | 'unhealthy'; latency: number };
      redis: { status: 'healthy' | 'unhealthy'; latency: number };
    } = {
      postgres: { status: 'unhealthy', latency: 0 },
      redis: { status: 'unhealthy', latency: 0 },
    };

    // Test PostgreSQL
    try {
      const start = Date.now();
      await db.$queryRaw`SELECT 1`;
      results.postgres = {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      logger.error('PostgreSQL health check failed', error);
    }

    // Test Redis
    try {
      const redis = getRedisClient();
      const start = Date.now();
      await redis.ping();
      results.redis = {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      logger.error('Redis health check failed', error);
    }

    return results;
  }
}

export const monitoringService = new MonitoringService();