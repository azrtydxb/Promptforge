export interface Draft {
  id: string;
  promptId: string | null; // null for new prompts
  title: string;
  content: string;
  description: string;
  tags: string[];
  timestamp: number;
  isNew: boolean;
}

export class DraftStorage {
  private readonly STORAGE_KEY_PREFIX = 'promptforge_draft_';
  private readonly MAX_DRAFT_AGE_DAYS = 30;
  private readonly MAX_DRAFT_SIZE = 100000; // 100KB per draft

  private getStorageKey(promptId: string | null): string {
    return `${this.STORAGE_KEY_PREFIX}${promptId || 'new'}`;
  }

  saveDraft(draft: Draft): boolean {
    try {
      // Check draft size
      const draftString = JSON.stringify(draft);
      if (draftString.length > this.MAX_DRAFT_SIZE) {
        console.warn('Draft too large to save:', draftString.length);
        return false;
      }

      // Save to localStorage
      localStorage.setItem(this.getStorageKey(draft.promptId), draftString);
      
      // Cleanup old drafts
      this.cleanupOldDrafts();
      
      return true;
    } catch (error) {
      console.error('Failed to save draft:', error);
      return false;
    }
  }

  getDraft(promptId: string | null): Draft | null {
    try {
      const key = this.getStorageKey(promptId);
      const draftString = localStorage.getItem(key);
      
      if (!draftString) {
        return null;
      }

      const draft = JSON.parse(draftString) as Draft;
      
      // Check if draft is too old
      const ageInDays = (Date.now() - draft.timestamp) / (1000 * 60 * 60 * 24);
      if (ageInDays > this.MAX_DRAFT_AGE_DAYS) {
        this.deleteDraft(promptId);
        return null;
      }

      return draft;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }

  deleteDraft(promptId: string | null): void {
    try {
      localStorage.removeItem(this.getStorageKey(promptId));
    } catch (error) {
      console.error('Failed to delete draft:', error);
    }
  }

  getAllDrafts(): Draft[] {
    const drafts: Draft[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_KEY_PREFIX)) {
          const draftString = localStorage.getItem(key);
          if (draftString) {
            try {
              const draft = JSON.parse(draftString) as Draft;
              drafts.push(draft);
            } catch {
              // Skip invalid drafts
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to get all drafts:', error);
    }

    return drafts;
  }

  cleanupOldDrafts(): void {
    try {
      const now = Date.now();
      const maxAge = this.MAX_DRAFT_AGE_DAYS * 24 * 60 * 60 * 1000;

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.STORAGE_KEY_PREFIX)) {
          const draftString = localStorage.getItem(key);
          if (draftString) {
            try {
              const draft = JSON.parse(draftString) as Draft;
              if (now - draft.timestamp > maxAge) {
                localStorage.removeItem(key);
              }
            } catch {
              // Remove invalid drafts
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old drafts:', error);
    }
  }

  hasDraft(promptId: string | null): boolean {
    return this.getDraft(promptId) !== null;
  }

  // Check if localStorage is available
  isStorageAvailable(): boolean {
    try {
      const testKey = '__promptforge_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const draftStorage = new DraftStorage();