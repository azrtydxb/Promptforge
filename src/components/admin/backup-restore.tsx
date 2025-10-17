"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  Upload,
  Database,
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2
} from 'lucide-react';
import type { BackupData, RestoreProgress, ValidationResult } from '@/types/backup';

export function BackupRestore() {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<RestoreProgress | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateBackup = async () => {
    try {
      setIsCreatingBackup(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/backup', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create backup');
      }

      // Get the blob and create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `promptforge-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess('Backup created and downloaded successfully');
    } catch (error) {
      console.error('Backup error:', error);
      setError(error instanceof Error ? error.message : 'Failed to create backup');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsValidating(true);
      setError(null);
      setValidation(null);
      setSuccess(null);

      // Read file
      const text = await file.text();
      const backup: BackupData = JSON.parse(text);

      // Validate backup
      const response = await fetch('/api/admin/restore', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to validate backup');
      }

      const result = await response.json();
      setValidation(result.validation);

      if (!result.validation.valid) {
        setError('Backup validation failed. Please check the errors below.');
      } else {
        setSuccess('Backup file is valid and ready to restore');
      }
    } catch (error) {
      console.error('Validation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to validate backup file');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRestore = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please select a backup file first');
      return;
    }

    try {
      setIsRestoring(true);
      setError(null);
      setSuccess(null);
      setRestoreProgress(null);

      // Read file
      const text = await file.text();
      const backup: BackupData = JSON.parse(text);

      // Restore backup
      const response = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore backup');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Restore failed');
      }

      setRestoreProgress(result.progress);
      setSuccess('Database restored successfully! Please refresh the page.');
    } catch (error) {
      console.error('Restore error:', error);
      setError(error instanceof Error ? error.message : 'Failed to restore backup');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDryRun = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please select a backup file first');
      return;
    }

    try {
      setIsRestoring(true);
      setError(null);
      setSuccess(null);

      // Read file
      const text = await file.text();
      const backup: BackupData = JSON.parse(text);

      // Dry run
      const response = await fetch('/api/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup, options: { dryRun: true } }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to validate restore');
      }

      const result = await response.json();
      setSuccess('Dry run completed successfully - no data was modified');
      setValidation(result.validation);
    } catch (error) {
      console.error('Dry run error:', error);
      setError(error instanceof Error ? error.message : 'Failed to perform dry run');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Create Backup
          </CardTitle>
          <CardDescription>
            Export all database data to a JSON file for backup purposes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This will create a complete backup of all database tables including users, prompts, teams, and settings.
              The backup file will be downloaded as a JSON file.
            </AlertDescription>
          </Alert>

          <LoadingButton
            onClick={handleCreateBackup}
            loading={isCreatingBackup}
            loadingText="Creating Backup..."
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Create Backup
          </LoadingButton>
        </CardContent>
      </Card>

      {/* Restore Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Restore from Backup
          </CardTitle>
          <CardDescription>
            Import and restore database from a backup file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Restoring from backup will replace all existing data in the database.
              This action cannot be undone. It is recommended to create a backup of the current state before restoring.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Backup File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>

          {isValidating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating backup file...
            </div>
          )}

          {validation && (
            <div className="space-y-2">
              {validation.valid ? (
                <Alert>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    Backup file is valid and ready to restore
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Validation Failed</strong>
                    <ul className="list-disc list-inside mt-2">
                      {validation.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {validation.warnings.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warnings:</strong>
                    <ul className="list-disc list-inside mt-2">
                      {validation.warnings.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {restoreProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{restoreProgress.message}</span>
                <span>{restoreProgress.percentage}%</span>
              </div>
              <Progress value={restoreProgress.percentage} />
              {restoreProgress.currentTable && (
                <p className="text-xs text-muted-foreground">
                  Current table: {restoreProgress.currentTable}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleDryRun}
              disabled={isRestoring || !validation?.valid}
              variant="outline"
              className="flex-1"
            >
              {isRestoring ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Dry Run (Test)
            </Button>

            <LoadingButton
              onClick={handleRestore}
              disabled={!validation?.valid}
              loading={isRestoring}
              loadingText="Restoring..."
              variant="destructive"
              className="flex-1"
            >
              <Upload className="mr-2 h-4 w-4" />
              Restore Database
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
