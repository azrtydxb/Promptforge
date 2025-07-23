import { NextResponse } from 'next/server';
import { getQueueStats } from '@/lib/queues/embedding-queue';
import { requireAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    // Only authenticated users can check queue status
    await requireAuth();

    const stats = await getQueueStats();

    return NextResponse.json({
      success: true,
      queue: 'embeddings',
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting queue status', { error });
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}