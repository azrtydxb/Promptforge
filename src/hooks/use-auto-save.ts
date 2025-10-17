import { useEffect, useRef, useState, useCallback } from 'react';
import { saveDraft } from '@/app/actions/drafts.actions';
import { toast } from 'sonner';

interface DraftData {
  promptId?: string;
  title: string;
  description?: string;
  content?: string;
  folderId?: string | null;
  tags?: string[];
}

interface UseAutoSaveOptions {
  data: DraftData;
  enabled?: boolean;
  debounceMs?: number;
  onSaveSuccess?: (draft: unknown) => void;
  onSaveError?: (error: string) => void;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutoSave({
  data,
  enabled = true,
  debounceMs = 2000,
  onSaveSuccess,
  onSaveError,
}: UseAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const previousDataRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const save = useCallback(async (draftData: DraftData) => {
    // Prevent concurrent saves
    if (isSavingRef.current) {
      return;
    }

    // Cancel any pending save
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this save operation
    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;

    isSavingRef.current = true;

    // Only update state if component is still mounted
    if (isMountedRef.current) {
      setSaveStatus('saving');
    }

    try {
      // Note: saveDraft is a Next.js server action which doesn't support AbortSignal.
      // We use the AbortController to track cancellation and prevent state updates
      // after the operation is aborted.
      const result = await saveDraft(draftData);

      // Check if this save was aborted or component unmounted
      if (currentController.signal.aborted || !isMountedRef.current) {
        return;
      }

      if (result.success) {
        setSaveStatus('saved');
        setLastSaved(new Date());
        onSaveSuccess?.(result.draft);

        // Reset to idle after 2 seconds
        setTimeout(() => {
          if (isMountedRef.current) {
            setSaveStatus('idle');
          }
        }, 2000);
      } else {
        setSaveStatus('error');
        onSaveError?.(result.error || 'Failed to save draft');
        toast.error('Failed to save draft');
      }
    } catch {
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) {
        return;
      }

      setSaveStatus('error');
      onSaveError?.('An error occurred while saving');
      toast.error('Failed to save draft');
    } finally {
      isSavingRef.current = false;
    }
  }, [onSaveSuccess, onSaveError]);

  useEffect(() => {
    if (!enabled || !data.title) {
      return;
    }

    // Serialize data for comparison
    const currentData = JSON.stringify(data);

    // Don't save if data hasn't changed
    if (currentData === previousDataRef.current) {
      return;
    }

    previousDataRef.current = currentData;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      save(data);
    }, debounceMs);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, debounceMs, save]);

  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    save(data);
  }, [data, save]);

  // Cleanup on unmount: abort pending saves and prevent state updates
  useEffect(() => {
    return () => {
      isMountedRef.current = false;

      // Abort any pending save operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    lastSaved,
    forceSave,
  };
}
