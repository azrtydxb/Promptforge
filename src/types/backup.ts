/**
 * Backup and Restore System Types
 *
 * This system provides intelligent backup and restore functionality with:
 * - Version detection and migration
 * - Schema evolution handling
 * - Data integrity validation
 * - Incremental and full backup support
 */

export interface BackupMetadata {
  version: string; // App version (from package.json)
  schemaVersion: string; // Database schema version
  timestamp: string; // ISO timestamp
  type: 'full' | 'incremental';
  size: number; // Size in bytes
  recordCounts: Record<string, number>; // Count of records per table
  checksum: string; // Data integrity checksum
}

export interface BackupData {
  metadata: BackupMetadata;
  data: {
    // User data
    users?: unknown[];
    accounts?: unknown[];
    sessions?: unknown[];
    userBadges?: unknown[];
    userFollows?: unknown[];

    // Prompt data
    folders?: unknown[];
    prompts?: unknown[];
    promptVersions?: unknown[];
    promptLikes?: unknown[];
    promptFavorites?: unknown[];
    tags?: unknown[];
    promptDrafts?: unknown[];

    // Shared/Marketplace data
    sharedPrompts?: unknown[];
    collections?: unknown[];
    collectionPrompts?: unknown[];
    promptComments?: unknown[];
    commentLikes?: unknown[];
    promptViews?: unknown[];
    promptCopies?: unknown[];
    promptRatings?: unknown[];

    // Team data
    teams?: unknown[];
    teamMembers?: unknown[];
    teamPrompts?: unknown[];
    teamPromptVersions?: unknown[];
    teamFolders?: unknown[];
    teamTags?: unknown[];
    teamInvitations?: unknown[];
    teamActivities?: unknown[];

    // System settings
    systemSettings?: unknown[];
    aiSettings?: unknown[];
    promptTemplates?: unknown[];

    // Analytics
    aiUsageLogs?: unknown[];
    searchHistory?: unknown[];
    promptShareLinks?: unknown[];
    promptShareViews?: unknown[];

    // Moderation
    moderationRules?: unknown[];
    moderationLogs?: unknown[];
  };
}

export interface RestoreOptions {
  dryRun?: boolean; // Validate without applying changes
  skipMigration?: boolean; // Skip automatic migration (dangerous!)
  preserveExisting?: boolean; // Don't delete existing data
  tables?: string[]; // Restore specific tables only
  onProgress?: (progress: RestoreProgress) => void;
}

export interface RestoreProgress {
  stage: 'validating' | 'migrating' | 'clearing' | 'restoring' | 'indexing' | 'complete';
  currentTable?: string;
  processedRecords: number;
  totalRecords: number;
  percentage: number;
  message: string;
  errors?: string[];
}

export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  migrationsApplied: string[];
  warnings: string[];
  errors: string[];
  transformedData?: BackupData;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  compatibilityIssues: string[];
}

/**
 * Version compatibility matrix
 * Defines which versions can be migrated to which versions
 */
export interface VersionCompatibility {
  sourceVersion: string;
  targetVersion: string;
  compatible: boolean;
  requiresMigration: boolean;
  migrationPath?: string[]; // Intermediate versions if needed
  breaking: boolean;
}

/**
 * Migration function signature
 * Each migration transforms data from one version to another
 */
export type MigrationFunction = (data: BackupData) => Promise<BackupData>;

/**
 * Migration definition
 */
export interface Migration {
  id: string;
  fromVersion: string;
  toVersion: string;
  description: string;
  breaking: boolean;
  up: MigrationFunction;
  down?: MigrationFunction; // Rollback function
}
