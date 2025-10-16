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

  const save = useCallback(async (draftData: DraftData) => {
    // Prevent concurrent saves
    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    setSaveStatus('saving');

    try {
      const result = await saveDraft(draftData);

      if (result.success) {
        setSaveStatus('saved');
        setLastSaved(new Date());
        onSaveSuccess?.(result.draft);

        // Reset to idle after 2 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } else {
        setSaveStatus('error');
        onSaveError?.(result.error || 'Failed to save draft');
        toast.error('Failed to save draft');
      }
    } catch {
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

  return {
    saveStatus,
    lastSaved,
    forceSave,
  };
}
