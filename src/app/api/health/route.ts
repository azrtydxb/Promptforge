import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { PerformanceMonitor } from '@/lib/performance';

export async function GET() {
  return PerformanceMonitor.measureApi('health', async () => {
    try {
      // Check database connection
      await db.$queryRaw`SELECT 1`;

      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
      });
    } catch (error) {
      console.error('Health check failed:', error);
      return NextResponse.json(
        {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          database: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 503 }
      );
    }
  });
}
