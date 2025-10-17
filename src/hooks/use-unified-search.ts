import { useState, useCallback } from "react";
import { searchPrompts } from "@/app/actions/search.actions";
import { searchPromptsKeyword, searchSharedPromptsKeyword, searchTemplatesKeyword } from "@/app/actions/keyword-search.actions";
import { updateSearchClick } from "@/app/actions/search-history.actions";
import type { SearchDataSource, SearchMode, SearchFilters } from "@/components/search/unified-search";

interface UseUnifiedSearchOptions {
  dataSource: SearchDataSource;
  onResultsChange?: (results: unknown[], count: number) => void;
  pageSize?: number;
}

interface SearchState {
  results: unknown[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  semanticSearchEnabled: false;
}

export function useUnifiedSearch({
  dataSource,
  onResultsChange,
  pageSize = 20,
}: UseUnifiedSearchOptions) {
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    semanticSearchEnabled: false, // Always false now - AI functionality removed
  });

  const performSearch = useCallback(async (
    query: string,
    mode: SearchMode,
    filters: SearchFilters
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let results: unknown[] = [];
      let totalCount = 0;

      // Only keyword mode available (AI functionality removed)
      switch (dataSource) {
        case "prompts":
          const response = await searchPromptsKeyword({
            query,
            limit: pageSize,
            filters: {
              tags: filters.tags,
              folderId: filters.folderId,
              hasEnhancement: filters.hasEnhancement,
              dateRange: filters.dateRange,
            },
          });
          results = response.prompts || [];
          totalCount = response.total || results.length;
          break;

        case "templates":
          // Templates use keyword search only for now
          const templateResponse = await searchTemplatesKeyword({
            query,
            limit: pageSize,
            filters: {
              tags: filters.tags,
            },
          });
          results = templateResponse.templates || [];
          totalCount = templateResponse.total || results.length;
          break;

        case "shared":
          // Shared prompts - keyword search only
          const sharedResponse = await searchSharedPromptsKeyword({
            query,
            limit: pageSize,
            filters: {
              tags: filters.tags,
            },
          });
          results = sharedResponse.prompts || [];
          totalCount = sharedResponse.total || results.length;
          break;

        case "all":
          // Search across all sources - keyword only
          const allResponse = await searchPrompts({
            query,
            limit: pageSize,
            filters: {
              tags: filters.tags,
              hasEnhancement: filters.hasEnhancement,
            },
          });
          results = allResponse.prompts || [];
          totalCount = results.length;
          break;
      }

      setState(prev => ({ 
        ...prev, 
        results, 
        totalCount,
        isLoading: false 
      }));

      onResultsChange?.(results, totalCount);
    } catch (error) {
      console.error("Search error:", error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Search failed",
        isLoading: false
      }));
    }
  }, [dataSource, pageSize, onResultsChange]);

  const trackResultClick = useCallback(async (resultId: string, searchId?: string) => {
    if (searchId) {
      try {
        await updateSearchClick(searchId, resultId);
      } catch (error) {
        console.error("Error tracking search click:", error);
      }
    }
  }, []);

  const loadMore = useCallback(() => {
    setState(prev => ({ ...prev, currentPage: prev.currentPage + 1 }));
  }, []);

  const reset = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      results: [], 
      currentPage: 1, 
      totalCount: 0,
      error: null 
    }));
  }, []);

  return {
    ...state,
    performSearch,
    trackResultClick,
    loadMore,
    reset,
    hasMore: state.results.length < state.totalCount,
  };
}