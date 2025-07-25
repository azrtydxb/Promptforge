import { useState, useCallback, useEffect } from "react";
import { searchPrompts, searchPromptsHybrid } from "@/app/actions/search.actions";
import { searchPromptsKeyword, searchSharedPromptsKeyword, searchTemplatesKeyword } from "@/app/actions/keyword-search.actions";
import { getSharedPrompts } from "@/app/actions/shared-prompts.actions";
import { getPromptTemplates } from "@/app/actions/template.actions";
import { canUseSemanticSearch } from "@/app/actions/semantic-search.actions";
import { updateSearchClick } from "@/app/actions/search-history.actions";
import type { SearchDataSource, SearchMode, SearchFilters } from "@/components/search/unified-search";

interface UseUnifiedSearchOptions {
  dataSource: SearchDataSource;
  onResultsChange?: (results: any[], count: number) => void;
  pageSize?: number;
}

interface SearchState {
  results: any[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  semanticSearchEnabled: boolean;
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
    semanticSearchEnabled: false,
  });

  // Check if semantic search is enabled on mount
  useEffect(() => {
    checkSemanticSearchStatus();
  }, []);

  const checkSemanticSearchStatus = async () => {
    try {
      const status = await canUseSemanticSearch();
      setState(prev => ({ ...prev, semanticSearchEnabled: status.enabled }));
    } catch (error) {
      console.error("Error checking semantic search status:", error);
    }
  };

  const performSearch = useCallback(async (
    query: string,
    mode: SearchMode,
    filters: SearchFilters
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let results: any[] = [];
      let totalCount = 0;

      // Force keyword mode if semantic search is disabled
      const effectiveMode = state.semanticSearchEnabled ? mode : "keyword";

      switch (dataSource) {
        case "prompts":
          if (effectiveMode === "keyword") {
            // Use standard keyword search without embeddings
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
          } else if (effectiveMode === "hybrid") {
            // Use hybrid search
            const response = await searchPromptsHybrid({
              query,
              limit: pageSize,
              keywordWeight: 0.3,
              filters: {
                tags: filters.tags,
                folderId: filters.folderId,
                hasEnhancement: filters.hasEnhancement,
                dateRange: filters.dateRange,
              },
            });
            results = response.prompts || [];
            totalCount = response.total || results.length;
          } else {
            // Pure semantic search
            const response = await searchPrompts({
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
          }
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
          // Shared prompts - use keyword search when semantic is disabled
          if (effectiveMode === "keyword" || !state.semanticSearchEnabled) {
            const sharedResponse = await searchSharedPromptsKeyword({
              query,
              limit: pageSize,
              filters: {
                tags: filters.tags,
              },
            });
            results = sharedResponse.prompts || [];
            totalCount = sharedResponse.total || results.length;
          } else {
            // For semantic/hybrid search on shared prompts, we'd need to implement it
            // For now, fall back to keyword search
            const sharedResponse = await searchSharedPromptsKeyword({
              query,
              limit: pageSize,
              filters: {
                tags: filters.tags,
              },
            });
            results = sharedResponse.prompts || [];
            totalCount = sharedResponse.total || results.length;
          }
          break;

        case "all":
          // Search across all sources
          // This would require implementing a unified search endpoint
          // For now, we'll just search prompts
          const allResponse = await searchPromptsHybrid({
            query,
            limit: pageSize,
            includeTemplates: true,
            filters: {
              tags: filters.tags,
              hasEnhancement: filters.hasEnhancement,
            },
          });
          results = [...(allResponse.prompts || []), ...(allResponse.templates || [])];
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
  }, [dataSource, pageSize, state.semanticSearchEnabled, state.currentPage, onResultsChange]);

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