/**
 * Backup Service
 * Handles database backup operations with version tracking and integrity checks
 */

import crypto from 'crypto';
import type { BackupData, BackupMetadata } from '@/types/backup';
import { db as prisma } from '@/lib/db';

export class BackupService {
  /**
   * Create a full backup of all database tables
   */
  async createFullBackup(): Promise<BackupData> {
    const startTime = Date.now();

    // Fetch all data from all tables
    const [
      users,
      accounts,
      sessions,
      userBadges,
      userFollows,
      folders,
      prompts,
      promptVersions,
      promptLikes,
      promptFavorites,
      tags,
      promptDrafts,
      sharedPrompts,
      collections,
      collectionPrompts,
      promptComments,
      commentLikes,
      promptViews,
      promptCopies,
      promptRatings,
      teams,
      teamMembers,
      teamPrompts,
      teamPromptVersions,
      teamFolders,
      teamTags,
      teamInvitations,
      teamActivities,
      systemSettings,
      promptTemplates,
      searchHistory,
      promptShareLinks,
      promptShareViews,
      moderationRules,
      moderationLogs,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.account.findMany(),
      prisma.session.findMany(),
      prisma.userBadge.findMany(),
      prisma.userFollow.findMany(),
      prisma.folder.findMany(),
      prisma.prompt.findMany(),
      prisma.promptVersion.findMany(),
      prisma.promptLike.findMany(),
      prisma.promptFavorite.findMany(),
      prisma.tag.findMany(),
      prisma.promptDraft.findMany(),
      prisma.sharedPrompt.findMany(),
      prisma.collection.findMany(),
      prisma.collectionPrompt.findMany(),
      prisma.promptComment.findMany(),
      prisma.commentLike.findMany(),
      prisma.promptView.findMany(),
      prisma.promptCopy.findMany(),
      prisma.promptRating.findMany(),
      prisma.team.findMany(),
      prisma.teamMember.findMany(),
      prisma.teamPrompt.findMany(),
      prisma.teamPromptVersion.findMany(),
      prisma.teamFolder.findMany(),
      prisma.teamTag.findMany(),
      prisma.teamInvitation.findMany(),
      prisma.teamActivity.findMany(),
      prisma.systemSettings.findMany(),
      prisma.promptTemplate.findMany(),
      prisma.searchHistory.findMany(),
      prisma.promptShareLink.findMany(),
      prisma.promptShareView.findMany(),
      prisma.moderationRule.findMany(),
      prisma.moderationLog.findMany(),
    ]);

    // Build data object
    const data = {
      users,
      accounts,
      sessions,
      userBadges,
      userFollows,
      folders,
      prompts,
      promptVersions,
      promptLikes,
      promptFavorites,
      tags,
      promptDrafts,
      sharedPrompts,
      collections,
      collectionPrompts,
      promptComments,
      commentLikes,
      promptViews,
      promptCopies,
      promptRatings,
      teams,
      teamMembers,
      teamPrompts,
      teamPromptVersions,
      teamFolders,
      teamTags,
      teamInvitations,
      teamActivities,
      systemSettings,
      promptTemplates,
      searchHistory,
      promptShareLinks,
      promptShareViews,
      moderationRules,
      moderationLogs,
    };

    // Calculate record counts
    const recordCounts: Record<string, number> = {
      users: users.length,
      accounts: accounts.length,
      sessions: sessions.length,
      userBadges: userBadges.length,
      userFollows: userFollows.length,
      folders: folders.length,
      prompts: prompts.length,
      promptVersions: promptVersions.length,
      promptLikes: promptLikes.length,
      promptFavorites: promptFavorites.length,
      tags: tags.length,
      promptDrafts: promptDrafts.length,
      sharedPrompts: sharedPrompts.length,
      collections: collections.length,
      collectionPrompts: collectionPrompts.length,
      promptComments: promptComments.length,
      commentLikes: commentLikes.length,
      promptViews: promptViews.length,
      promptCopies: promptCopies.length,
      promptRatings: promptRatings.length,
      teams: teams.length,
      teamMembers: teamMembers.length,
      teamPrompts: teamPrompts.length,
      teamPromptVersions: teamPromptVersions.length,
      teamFolders: teamFolders.length,
      teamTags: teamTags.length,
      teamInvitations: teamInvitations.length,
      teamActivities: teamActivities.length,
      systemSettings: systemSettings.length,
      // AI-related models removed - these no longer exist in schema
      // aiSettings: aiSettings.length,
      // aiUsageLogs: aiUsageLogs.length,
      promptTemplates: promptTemplates.length,
      searchHistory: searchHistory.length,
      promptShareLinks: promptShareLinks.length,
      promptShareViews: promptShareViews.length,
      moderationRules: moderationRules.length,
      moderationLogs: moderationLogs.length,
    };

    // Calculate total size and checksum
    const dataString = JSON.stringify(data);
    const size = Buffer.byteLength(dataString);
    const checksum = crypto.createHash('sha256').update(dataString).digest('hex');

    // Get app version from package.json
    const packageJson = await import('@/../../package.json');
    const version = packageJson.version;

    // Get schema version (we'll use app version for now, but this could be separate)
    const schemaVersion = version;

    // Build metadata
    const metadata: BackupMetadata = {
      version,
      schemaVersion,
      timestamp: new Date().toISOString(),
      type: 'full',
      size,
      recordCounts,
      checksum,
    };

    const endTime = Date.now();
    console.log(`Backup completed in ${endTime - startTime}ms`);
    console.log(`Total size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total records: ${Object.values(recordCounts).reduce((a, b) => a + b, 0)}`);

    return {
      metadata,
      data,
    };
  }

  /**
   * Verify backup integrity
   */
  verifyBackup(backup: BackupData): boolean {
    const dataString = JSON.stringify(backup.data);
    const calculatedChecksum = crypto.createHash('sha256').update(dataString).digest('hex');
    return calculatedChecksum === backup.metadata.checksum;
  }

  /**
   * Get backup statistics
   */
  getBackupStats(backup: BackupData) {
    const totalRecords = Object.values(backup.metadata.recordCounts).reduce((a, b) => a + b, 0);
    const sizeMB = (backup.metadata.size / 1024 / 1024).toFixed(2);

    return {
      version: backup.metadata.version,
      schemaVersion: backup.metadata.schemaVersion,
      timestamp: backup.metadata.timestamp,
      type: backup.metadata.type,
      totalRecords,
      sizeMB,
      recordCounts: backup.metadata.recordCounts,
      verified: this.verifyBackup(backup),
    };
  }
}

export const backupService = new BackupService();
