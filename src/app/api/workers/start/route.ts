import { NextResponse } from 'next/server';
import { embeddingWorker } from '@/lib/queues/embedding-queue';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    // In production, workers should run as separate processes
    // This is only for development/testing
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Workers should not be started via API in production' },
        { status: 403 }
      );
    }

    // Check if worker is already running
    const isRunning = embeddingWorker.isRunning();
    
    if (!isRunning) {
      await embeddingWorker.run();
      logger.info('Embedding worker started');
    }

    return NextResponse.json({
      success: true,
      status: isRunning ? 'already running' : 'started',
      message: 'Embedding worker is running'
    });
  } catch (error) {
    logger.error('Error starting worker', { error });
    return NextResponse.json(
      { error: 'Failed to start worker' },
      { status: 500 }
    );
  }
}