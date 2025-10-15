/**
 * Migration Service
 * Handles version compatibility and data migration between schema versions
 */

import type {
  BackupData,
  Migration,
  MigrationResult,
  VersionCompatibility,
  MigrationFunction,
} from '@/types/backup';

export class MigrationService {
  private migrations: Migration[] = [];

  constructor() {
    this.registerMigrations();
  }

  /**
   * Register all available migrations
   */
  private registerMigrations(): void {
    // Example migration - add more as schema evolves
    // this.registerMigration({
    //   id: '0.1.0-to-0.2.0',
    //   fromVersion: '0.1.0',
    //   toVersion: '0.2.0',
    //   description: 'Add new user profile fields',
    //   breaking: false,
    //   up: async (data: BackupData) => {
    //     // Transform data structure here
    //     return data;
    //   },
    // });
  }

  /**
   * Register a new migration
   */
  registerMigration(migration: Migration): void {
    this.migrations.push(migration);
  }

  /**
   * Check version compatibility
   */
  async checkCompatibility(
    sourceVersion: string,
    targetVersion: string
  ): Promise<VersionCompatibility> {
    // If versions are the same, no migration needed
    if (sourceVersion === targetVersion) {
      return {
        sourceVersion,
        targetVersion,
        compatible: true,
        requiresMigration: false,
        breaking: false,
      };
    }

    // Find migration path
    const path = this.findMigrationPath(sourceVersion, targetVersion);

    if (!path || path.length === 0) {
      // Check if versions are close enough to be compatible without migration
      const sourceParts = sourceVersion.split('.').map(Number);
      const targetParts = targetVersion.split('.').map(Number);

      // Allow minor version differences without migration
      if (
        sourceParts[0] === targetParts[0] && // Same major version
        Math.abs(sourceParts[1] - targetParts[1]) <= 1 // Adjacent minor versions
      ) {
        return {
          sourceVersion,
          targetVersion,
          compatible: true,
          requiresMigration: false,
          breaking: false,
        };
      }

      return {
        sourceVersion,
        targetVersion,
        compatible: false,
        requiresMigration: true,
        breaking: true,
      };
    }

    // Check if any migration in path is breaking
    const breaking = path.some((m) => m.breaking);

    return {
      sourceVersion,
      targetVersion,
      compatible: true,
      requiresMigration: true,
      migrationPath: path.map((m) => m.id),
      breaking,
    };
  }

  /**
   * Find migration path between versions
   */
  private findMigrationPath(
    fromVersion: string,
    toVersion: string
  ): Migration[] | null {
    // Direct migration
    const direct = this.migrations.find(
      (m) => m.fromVersion === fromVersion && m.toVersion === toVersion
    );
    if (direct) {
      return [direct];
    }

    // Multi-hop migration using BFS
    const queue: Array<{ version: string; path: Migration[] }> = [
      { version: fromVersion, path: [] },
    ];
    const visited = new Set<string>([fromVersion]);

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Find all migrations from current version
      const nextMigrations = this.migrations.filter(
        (m) => m.fromVersion === current.version
      );

      for (const migration of nextMigrations) {
        if (migration.toVersion === toVersion) {
          return [...current.path, migration];
        }

        if (!visited.has(migration.toVersion)) {
          visited.add(migration.toVersion);
          queue.push({
            version: migration.toVersion,
            path: [...current.path, migration],
          });
        }
      }
    }

    return null;
  }

  /**
   * Migrate backup data from one version to another
   */
  async migrate(
    backup: BackupData,
    targetVersion: string
  ): Promise<MigrationResult> {
    const sourceVersion = backup.metadata.version;
    const errors: string[] = [];
    const warnings: string[] = [];
    const migrationsApplied: string[] = [];

    try {
      // Check compatibility
      const compatibility = await this.checkCompatibility(
        sourceVersion,
        targetVersion
      );

      if (!compatibility.compatible) {
        return {
          success: false,
          fromVersion: sourceVersion,
          toVersion: targetVersion,
          migrationsApplied: [],
          warnings: [],
          errors: [
            `Cannot migrate from version ${sourceVersion} to ${targetVersion} - no migration path found`,
          ],
        };
      }

      // If no migration required, return original data
      if (!compatibility.requiresMigration) {
        return {
          success: true,
          fromVersion: sourceVersion,
          toVersion: targetVersion,
          migrationsApplied: [],
          warnings: [],
          errors: [],
          transformedData: backup,
        };
      }

      // Find migration path
      const path = this.findMigrationPath(sourceVersion, targetVersion);
      if (!path) {
        return {
          success: false,
          fromVersion: sourceVersion,
          toVersion: targetVersion,
          migrationsApplied: [],
          warnings: [],
          errors: ['No migration path found'],
        };
      }

      // Apply migrations in sequence
      let currentData = backup;
      for (const migration of path) {
        try {
          console.log(
            `Applying migration: ${migration.id} - ${migration.description}`
          );
          currentData = await migration.up(currentData);
          migrationsApplied.push(migration.id);

          if (migration.breaking) {
            warnings.push(
              `Breaking migration applied: ${migration.id} - ${migration.description}`
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          errors.push(
            `Migration ${migration.id} failed: ${errorMessage}`
          );
          return {
            success: false,
            fromVersion: sourceVersion,
            toVersion: targetVersion,
            migrationsApplied,
            warnings,
            errors,
          };
        }
      }

      // Update metadata with new version
      currentData.metadata.version = targetVersion;
      currentData.metadata.schemaVersion = targetVersion;

      return {
        success: true,
        fromVersion: sourceVersion,
        toVersion: targetVersion,
        migrationsApplied,
        warnings,
        errors: [],
        transformedData: currentData,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        fromVersion: sourceVersion,
        toVersion: targetVersion,
        migrationsApplied,
        warnings,
        errors: [errorMessage],
      };
    }
  }

  /**
   * Get all registered migrations
   */
  getMigrations(): Migration[] {
    return this.migrations;
  }

  /**
   * Get migrations for a specific version range
   */
  getMigrationsForVersionRange(
    fromVersion: string,
    toVersion: string
  ): Migration[] {
    const path = this.findMigrationPath(fromVersion, toVersion);
    return path || [];
  }
}

export const migrationService = new MigrationService();
