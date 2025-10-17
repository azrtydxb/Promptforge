import { performance } from 'perf_hooks';

// Check if we're in a test environment
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

// Create a mock logger for test environment
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

// Only import logger if not in test environment
let logger = mockLogger;
if (!isTestEnvironment) {
  try {
    // Dynamic import to avoid issues in test environment
    const loggerModule = require('@/lib/logger');
    logger = loggerModule.logger;
  } catch (error) {
    // Fallback for when logger import fails
    logger = mockLogger;
  }
}

export interface PerformanceMetrics {
  avg: number;
  min: number;
  max: number;
  count: number;
  p95: number;
  p99: number;
}

export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();
  private static activeOperations = new Map<string, number>();
  
  static async measure<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const operationId = `${name}-${Date.now()}-${Math.random()}`;
    const start = performance.now();
    this.activeOperations.set(operationId, start);
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      this.activeOperations.delete(operationId);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}:error`, duration);
      this.activeOperations.delete(operationId);
      throw error;
    }
  }
  
  static measureSync<T>(
    name: string,
    fn: () => T
  ): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}:error`, duration);
      throw error;
    }
  }
  
  private static recordMetric(name: string, duration: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(duration);
    
    // Keep only last 1000 measurements
    if (values.length > 1000) {
      values.shift();
    }
    
    // Log slow operations
    const thresholds: Record<string, number> = {
      'database': 250,      // Increased: Complex queries with joins can take 200-250ms
      'cache': 200,         // Increased: Large JSON serialization can take 100-200ms
      'api': 1000,          // Increased: API routes with DB queries need more headroom
      'render': 16,         // Keep: 60fps target (16.67ms per frame)
    };
    
    const threshold = Object.entries(thresholds).find(([key]) => name.includes(key))?.[1] || 1000;
    
    if (duration > threshold && !isTestEnvironment) {
      logger.warn(`Slow operation: ${name}`, { 
        duration, 
        threshold,
        unit: 'ms'
      });
    }
  }
  
  static getMetrics(name?: string): Record<string, PerformanceMetrics> {
    const result: Record<string, PerformanceMetrics> = {};
    const metricsToProcess = name ? [name] : Array.from(this.metrics.keys());
    
    for (const metricName of metricsToProcess) {
      const values = this.metrics.get(metricName);
      if (!values || values.length === 0) continue;
      
      const sorted = [...values].sort((a, b) => a - b);
      const count = sorted.length;
      
      result[metricName] = {
        avg: sorted.reduce((a, b) => a + b, 0) / count,
        min: sorted[0],
        max: sorted[count - 1],
        count,
        p95: sorted[Math.floor(count * 0.95)],
        p99: sorted[Math.floor(count * 0.99)],
      };
    }
    
    return result;
  }
  
  static getActiveOperations(): Array<{ id: string; name: string; duration: number }> {
    const now = performance.now();
    const operations: Array<{ id: string; name: string; duration: number }> = [];
    
    for (const [operationId, startTime] of this.activeOperations.entries()) {
      const name = operationId.split('-').slice(0, -2).join('-');
      const duration = now - startTime;
      operations.push({ id: operationId, name, duration });
    }
    
    return operations.sort((a, b) => b.duration - a.duration);
  }
  
  static resetMetrics(name?: string) {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }
  
  // Database query wrapper
  static async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    return this.measure(`database:${queryName}`, queryFn);
  }
  
  // Cache operation wrapper
  static async measureCache<T>(
    operation: string,
    cacheFn: () => Promise<T>
  ): Promise<T> {
    return this.measure(`cache:${operation}`, cacheFn);
  }
  
  // API route wrapper
  static async measureApi<T>(
    route: string,
    handler: () => Promise<T>
  ): Promise<T> {
    return this.measure(`api:${route}`, handler);
  }
}

// Decorator for measuring function performance
export function measurePerformance(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;
    
    descriptor.value = async function (...args: any[]) {
      return PerformanceMonitor.measure(metricName, () => originalMethod.apply(this, args));
    };
    
    return descriptor;
  };
}

// Performance reporting utilities
export class PerformanceReporter {
  static generateReport(): {
    summary: Record<string, PerformanceMetrics>;
    slowOperations: Array<{ name: string; metrics: PerformanceMetrics }>;
    errors: Record<string, PerformanceMetrics>;
    activeOperations: Array<{ id: string; name: string; duration: number }>;
  } {
    const allMetrics = PerformanceMonitor.getMetrics();
    const summary: Record<string, PerformanceMetrics> = {};
    const errors: Record<string, PerformanceMetrics> = {};
    const slowOperations: Array<{ name: string; metrics: PerformanceMetrics }> = [];
    
    for (const [name, metrics] of Object.entries(allMetrics)) {
      if (name.includes(':error')) {
        const baseName = name.replace(':error', '');
        errors[baseName] = metrics;
      } else {
        summary[name] = metrics;
        
        // Flag slow operations (avg > 100ms or p95 > 500ms)
        if (metrics.avg > 100 || metrics.p95 > 500) {
          slowOperations.push({ name, metrics });
        }
      }
    }
    
    const activeOperations = PerformanceMonitor.getActiveOperations();
    
    return {
      summary,
      slowOperations,
      errors,
      activeOperations,
    };
  }
  
  static logReport() {
    if (isTestEnvironment) return; // Skip logging in test environment
    
    const report = this.generateReport();
    
    logger.info('Performance Report', {
      totalOperations: Object.keys(report.summary).length,
      slowOperationsCount: report.slowOperations.length,
      errorOperationsCount: Object.keys(report.errors).length,
      activeOperationsCount: report.activeOperations.length,
    });
    
    if (report.slowOperations.length > 0) {
      logger.warn('Slow Operations Detected', {
        operations: report.slowOperations.map(op => ({
          name: op.name,
          avgMs: Math.round(op.metrics.avg),
          p95Ms: Math.round(op.metrics.p95),
        }))
      });
    }
    
    if (report.activeOperations.length > 0) {
      logger.warn('Long-running Operations', {
        operations: report.activeOperations.slice(0, 10).map(op => ({
          name: op.name,
          durationMs: Math.round(op.duration),
        }))
      });
    }
  }
}

// Auto-reporting (run every 5 minutes in production)
if (process.env.NODE_ENV === 'production' && !isTestEnvironment) {
  setInterval(async () => {
    PerformanceReporter.logReport();
  }, 5 * 60 * 1000); // 5 minutes
}