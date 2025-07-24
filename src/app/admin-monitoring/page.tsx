"use client";

// Force dynamic rendering to fix Turbopack font loading issues
export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { RefreshCw, Database, Server, Activity, Clock, Users, HardDrive, Zap } from "lucide-react";
import { getAllMetrics } from "@/app/actions/admin.actions";
import type { PostgreSQLMetrics, RedisMetrics, CachePerformanceMetrics } from "@/lib/monitoring";

interface SystemHealth {
  postgres: { status: 'healthy' | 'unhealthy'; latency: number };
  redis: { status: 'healthy' | 'unhealthy'; latency: number };
}

interface MetricsData {
  postgresql: PostgreSQLMetrics | null;
  redis: RedisMetrics | null;
  cachePerformance: CachePerformanceMetrics | null;
  systemHealth: SystemHealth | null;
  errors: {
    postgresql: string | null;
    redis: string | null;
    cachePerformance: string | null;
    systemHealth: string | null;
  };
}

export default function AdminMonitoringPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const data = await getAllMetrics();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading && !metrics) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <div className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <Button onClick={fetchMetrics} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {metrics?.systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PostgreSQL Status</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={metrics.systemHealth.postgres.status === 'healthy' ? 'default' : 'destructive'}
                >
                  {metrics.systemHealth.postgres.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {metrics.systemHealth.postgres.latency}ms
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Redis Status</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={metrics.systemHealth.redis.status === 'healthy' ? 'default' : 'destructive'}
                >
                  {metrics.systemHealth.redis.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {metrics.systemHealth.redis.latency}ms
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PostgreSQL Metrics */}
      {metrics?.postgresql && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              PostgreSQL Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Connection and Query Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Connections</span>
                </div>
                <div className="text-2xl font-bold">{metrics.postgresql.connectionCount}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Active Queries</span>
                </div>
                <div className="text-2xl font-bold">{metrics.postgresql.activeQueries}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Database Size</span>
                </div>
                <div className="text-2xl font-bold">{formatBytes(metrics.postgresql.databaseSize)}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Cache Hit Ratio</span>
                </div>
                <div className="text-2xl font-bold">{metrics.postgresql.cacheHitRatio}%</div>
                <Progress value={metrics.postgresql.cacheHitRatio} className="h-2" />
              </div>
            </div>

            {/* Slow Queries */}
            {metrics.postgresql.slowQueries && metrics.postgresql.slowQueries.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-3">Slowest Queries</h4>
                <div className="space-y-2">
                  {metrics.postgresql.slowQueries.slice(0, 5).map((query, index: number) => (
                    <div key={index} className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <code className="text-sm bg-background px-2 py-1 rounded">
                          {query.query}
                        </code>
                        <Badge variant="outline">{query.meanTime.toFixed(2)}ms avg</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Calls: {query.calls} | Total: {query.duration.toFixed(2)}ms
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Table Statistics */}
            {metrics.postgresql.tableStats && metrics.postgresql.tableStats.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-3">Largest Tables</h4>
                <div className="space-y-2">
                  {metrics.postgresql.tableStats.slice(0, 5).map((table, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="font-medium">{table.tableName}</span>
                      <div className="text-sm text-muted-foreground">
                        {table.rowCount.toLocaleString()} rows | {table.size} | Index: {table.indexSize}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Redis Metrics */}
      {metrics?.redis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Redis Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Redis Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Uptime</span>
                </div>
                <div className="text-lg font-bold">{formatUptime(metrics.redis.info.uptime)}</div>
                <div className="text-xs text-muted-foreground">v{metrics.redis.info.version}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Connected Clients</span>
                </div>
                <div className="text-2xl font-bold">{metrics.redis.info.connectedClients}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Memory Used</span>
                </div>
                <div className="text-lg font-bold">{metrics.redis.info.usedMemoryHuman}</div>
                <Progress value={metrics.redis.performance.memoryEfficiency} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Ops/sec</span>
                </div>
                <div className="text-2xl font-bold">{metrics.redis.info.instantaneousOpsPerSec}</div>
              </div>
            </div>

            {/* Cache Performance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Hit Rate</span>
                <div className="text-2xl font-bold">{metrics.redis.performance.hitRate.toFixed(2)}%</div>
                <Progress value={metrics.redis.performance.hitRate} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium">Total Keys</span>
                <div className="text-2xl font-bold">{metrics.redis.keyStats.totalKeys.toLocaleString()}</div>
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium">Commands Processed</span>
                <div className="text-lg font-bold">{metrics.redis.info.totalCommandsProcessed.toLocaleString()}</div>
              </div>
            </div>

            {/* Key Patterns */}
            {metrics.redis.keyStats.keysByPattern && metrics.redis.keyStats.keysByPattern.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-3">Key Patterns</h4>
                <div className="space-y-2">
                  {metrics.redis.keyStats.keysByPattern.slice(0, 5).map((pattern, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <code className="text-sm">{pattern.pattern}</code>
                      <div className="text-sm text-muted-foreground">
                        {pattern.count.toLocaleString()} keys
                        {pattern.memory > 0 && ` | ${formatBytes(pattern.memory)}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cache Performance Summary */}
      {metrics?.cachePerformance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Cache Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Overall Hit Rate</span>
                <div className="text-2xl font-bold">{metrics.cachePerformance.hitRate.toFixed(2)}%</div>
                <Progress value={metrics.cachePerformance.hitRate} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium">Miss Rate</span>
                <div className="text-2xl font-bold">{metrics.cachePerformance.missRate.toFixed(2)}%</div>
                <Progress value={metrics.cachePerformance.missRate} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <span className="text-sm font-medium">Total Requests</span>
                <div className="text-2xl font-bold">{metrics.cachePerformance.totalRequests.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {metrics?.errors && Object.values(metrics.errors).some(error => error) && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.errors).map(([key, error]) => 
                error && (
                  <div key={key} className="p-2 bg-destructive/10 rounded text-sm">
                    <strong>{key}:</strong> {error as string}
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}