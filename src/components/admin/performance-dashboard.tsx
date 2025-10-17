'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface PerformanceData {
  timestamp: string;
  health: {
    database: boolean;
    redis: boolean;
    overall: boolean;
  };
  metrics: {
    summary: Record<string, {
      avg: number;
      min: number;
      max: number;
      count: number;
      p95: number;
      p99: number;
    }>;
    slowOperations: Array<{
      name: string;
      metrics: {
        avg: number;
        min: number;
        max: number;
        count: number;
        p95: number;
        p99: number;
      };
    }>;
    errors: Record<string, {
      avg: number;
      min: number;
      max: number;
      count: number;
      p95: number;
      p99: number;
    }>;
  };
  activeOperations: Array<{
    id: string;
    name: string;
    duration: number;
  }>;
  performance: {
    totalOperations: number;
    slowOperationsCount: number;
    errorOperationsCount: number;
    activeOperationsCount: number;
  };
}

export function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/performance');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastRefresh(new Date());
      } else {
        setError(result.error || 'Failed to fetch performance data');
      }
    } catch (err) {
      setError('Network error when fetching performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPerformanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (ms: number) => {
    if (ms < 1) return '< 1ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusIcon = (healthy: boolean) => {
    return healthy ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getOperationStatus = (avgMs: number) => {
    if (avgMs < 50) return <Badge variant="outline" className="text-green-600">Fast</Badge>;
    if (avgMs < 200) return <Badge variant="outline" className="text-yellow-600">Normal</Badge>;
    return <Badge variant="outline" className="text-red-600">Slow</Badge>;
  };

  if (loading && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Dashboard</CardTitle>
          <CardDescription>Loading performance metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Dashboard</CardTitle>
          <CardDescription>Error loading performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-red-500">{error}</p>
            <Button onClick={fetchPerformanceData} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            {lastRefresh && `Last updated: ${lastRefresh.toLocaleTimeString()}`}
          </p>
        </div>
        <Button onClick={fetchPerformanceData} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(data.health.database)}
              <span>Database</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(data.health.redis)}
              <span>Redis Cache</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(data.health.overall)}
              <span>Overall Status</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.performance.totalOperations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Slow Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.performance.slowOperationsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Error Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.performance.errorOperationsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.performance.activeOperationsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="operations" className="w-full">
        <TabsList>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="slow">Slow Operations</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="active">Active Operations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operation Metrics</CardTitle>
              <CardDescription>Performance metrics for all operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(data.metrics.summary).map(([name, metrics]) => (
                  <div key={name} className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{name}</span>
                      {getOperationStatus(metrics.avg)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg: {formatDuration(metrics.avg)} | P95: {formatDuration(metrics.p95)} | Count: {metrics.count}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="slow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Slow Operations</CardTitle>
              <CardDescription>Operations that are performing below expectations</CardDescription>
            </CardHeader>
            <CardContent>
              {data.metrics.slowOperations.length > 0 ? (
                <div className="space-y-4">
                  {data.metrics.slowOperations.map((op) => (
                    <div key={op.name} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{op.name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Avg: {formatDuration(op.metrics.avg)} | Max: {formatDuration(op.metrics.max)} | Count: {op.metrics.count}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No slow operations detected</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Operations</CardTitle>
              <CardDescription>Operations that have encountered errors</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(data.metrics.errors).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(data.metrics.errors).map(([name, metrics]) => (
                    <div key={name} className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="font-medium">{name}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Count: {metrics.count} | Avg Duration: {formatDuration(metrics.avg)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No error operations detected</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Operations</CardTitle>
              <CardDescription>Operations currently running</CardDescription>
            </CardHeader>
            <CardContent>
              {data.activeOperations.length > 0 ? (
                <div className="space-y-4">
                  {data.activeOperations.map((op) => (
                    <div key={op.id} className="flex items-center justify-between border-b pb-2">
                      <span className="font-medium">{op.name}</span>
                      <div className="text-sm text-muted-foreground">
                        Running for: {formatDuration(op.duration)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No active operations</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}