/**
 * Backup API Endpoint
 * Allows admins to create database backups
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { UserRole } from '@/generated/prisma';
import { backupService } from '@/lib/services/backup.service';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Create backup
    console.log('Creating backup...');
    const backup = await backupService.createFullBackup();

    // Get backup statistics
    const stats = backupService.getBackupStats(backup);

    // Return backup as JSON download
    const filename = `promptforge-backup-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { error: 'Failed to create backup', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

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

    // Create backup
    console.log('Creating backup...');
    const backup = await backupService.createFullBackup();

    // Get backup statistics
    const stats = backupService.getBackupStats(backup);

    // Return backup data and stats (not as download)
    return NextResponse.json({
      success: true,
      backup,
      stats,
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json(
      { error: 'Failed to create backup', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
