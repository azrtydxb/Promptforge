import { NextRequest, NextResponse } from 'next/server';
import { PerformanceReporter, PerformanceMonitor } from '@/lib/performance';
import { checkDatabaseHealth } from '@/lib/db';
import { checkRedisHealth } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    // Generate performance report
    const report = PerformanceReporter.generateReport();
    
    // Check database health
    const dbHealthy = await checkDatabaseHealth();
    
    // Check Redis connection
    const redisHealthy = await checkRedisHealth();
    
    // Get active operations
    const activeOperations = PerformanceMonitor.getActiveOperations();
    
    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        health: {
          database: dbHealthy,
          redis: redisHealthy,
          overall: dbHealthy && redisHealthy,
        },
        metrics: {
          summary: report.summary,
          slowOperations: report.slowOperations,
          errors: report.errors,
        },
        activeOperations: activeOperations.slice(0, 10), // Only return top 10
        performance: {
          totalOperations: Object.keys(report.summary).length,
          slowOperationsCount: report.slowOperations.length,
          errorOperationsCount: Object.keys(report.errors).length,
          activeOperationsCount: activeOperations.length,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch performance metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}