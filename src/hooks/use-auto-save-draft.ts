import { useState, useCallback, useEffect, useRef } from "react";
import { draftStorage, type Draft } from "@/services/draft-storage";
import { useDebounce } from "@/hooks/use-debounce";

interface UseAutoSaveDraftOptions {
  promptId: string | null;
  isNew: boolean;
  debounceDelay?: number;
  enabled?: boolean;
}

interface UseAutoSaveDraftReturn {
  saveDraft: (data: Partial<Omit<Draft, 'id' | 'promptId' | 'isNew' | 'timestamp'>>) => void;
  loadDraft: () => Draft | null;
  clearDraft: () => void;
  hasDraft: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  draftStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export function useAutoSaveDraft({
  promptId,
  isNew,
  debounceDelay = 1000,
  enabled = true,
}: UseAutoSaveDraftOptions): UseAutoSaveDraftReturn {
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<Partial<Draft> | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if storage is available
  const isStorageAvailable = draftStorage.isStorageAvailable();

  // Debounce the pending draft
  const debouncedDraft = useDebounce(pendingDraft, debounceDelay);

  // Check for existing draft on mount
  useEffect(() => {
    if (enabled && isStorageAvailable) {
      setHasDraft(draftStorage.hasDraft(promptId));
    }
  }, [promptId, enabled, isStorageAvailable]);

  // Save draft when debounced value changes
  useEffect(() => {
    if (!enabled || !isStorageAvailable || !debouncedDraft) {
      return;
    }

    const performSave = async () => {
      setDraftStatus('saving');

      const draft: Draft = {
        id: promptId || 'new',
        promptId,
        isNew,
        timestamp: Date.now(),
        title: debouncedDraft.title || '',
        content: debouncedDraft.content || '',
        description: debouncedDraft.description || '',
        tags: debouncedDraft.tags || [],
      };

      const success = draftStorage.saveDraft(draft);

      if (success) {
        setDraftStatus('saved');
        setLastSaved(new Date());
        setHasDraft(true);

        // Reset to idle after 2 seconds
        saveTimeoutRef.current = setTimeout(() => {
          setDraftStatus('idle');
        }, 2000);
      } else {
        setDraftStatus('error');
        
        // Reset to idle after 3 seconds
        saveTimeoutRef.current = setTimeout(() => {
          setDraftStatus('idle');
        }, 3000);
      }
    };

    performSave();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [debouncedDraft, promptId, isNew, enabled, isStorageAvailable]);

  // Save draft function
  const saveDraft = useCallback((data: Partial<Omit<Draft, 'id' | 'promptId' | 'isNew' | 'timestamp'>>) => {
    if (!enabled || !isStorageAvailable) {
      return;
    }

    setPendingDraft(data);
  }, [enabled, isStorageAvailable]);

  // Load draft function
  const loadDraft = useCallback((): Draft | null => {
    if (!enabled || !isStorageAvailable) {
      return null;
    }

    return draftStorage.getDraft(promptId);
  }, [promptId, enabled, isStorageAvailable]);

  // Clear draft function
  const clearDraft = useCallback(() => {
    if (!isStorageAvailable) {
      return;
    }

    draftStorage.deleteDraft(promptId);
    setHasDraft(false);
    setLastSaved(null);
    setDraftStatus('idle');
    setPendingDraft(null);
  }, [promptId, isStorageAvailable]);

  return {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    isSaving: draftStatus === 'saving',
    lastSaved,
    draftStatus,
  };
}