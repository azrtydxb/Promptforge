/**
 * Restore API Endpoint
 * Allows admins to restore database from backup
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@/generated/prisma';
import { restoreService } from '@/lib/services/restore.service';
import type { BackupData, RestoreOptions } from '@/types/backup';

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { backup, options } = body as {
      backup: BackupData;
      options?: RestoreOptions;
    };

    if (!backup) {
      return NextResponse.json({ error: 'Missing backup data' }, { status: 400 });
    }

    // Validate backup first
    console.log('Validating backup...');
    const validation = await restoreService.validateBackup(backup);

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Backup validation failed',
        validation,
      }, { status: 400 });
    }

    // If dry run requested, return validation only
    if (options?.dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        validation,
        message: 'Dry run completed - no data was modified',
      });
    }

    // Perform restore
    console.log('Starting restore...');
    const progress = await restoreService.restoreBackup(backup, options);

    if (progress.errors && progress.errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Restore failed',
        progress,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      progress,
      message: 'Database restored successfully',
    });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to restore backup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Validate endpoint - check backup without restoring
export async function PUT(request: NextRequest) {
  try {
    // Check authentication and admin role
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { backup } = body as { backup: BackupData };

    if (!backup) {
      return NextResponse.json({ error: 'Missing backup data' }, { status: 400 });
    }

    // Validate backup
    console.log('Validating backup...');
    const validation = await restoreService.validateBackup(backup);

    return NextResponse.json({
      success: true,
      validation,
    });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate backup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
