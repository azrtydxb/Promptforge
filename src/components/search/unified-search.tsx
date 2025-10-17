"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SearchHistoryPanel } from "@/components/search/search-history-panel";
import { saveSearchToHistory } from "@/app/actions/search-history.actions";

export type SearchDataSource = "prompts" | "templates" | "shared" | "all";
export type SearchMode = "keyword";

export interface SearchFilters {
  tags?: string[];
  category?: string;
  folderId?: string | null;
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  author?: string;
  isPublic?: boolean;
  hasEnhancement?: boolean;
}

interface UnifiedSearchProps {
  dataSource: SearchDataSource;
  onSearch: (query: string, mode: SearchMode, filters: SearchFilters) => Promise<void>;
  onResultSelect?: (result: unknown) => void;
  placeholder?: string;
  filters?: React.ReactNode;
  showHistory?: boolean;
  className?: string;
  autoFocus?: boolean;
  initialQuery?: string;
  initialFilters?: SearchFilters;
  onQueryChange?: (query: string) => void;
}

export function UnifiedSearch({
  dataSource,
  onSearch,
  placeholder = "Search...",
  filters,
  showHistory = true,
  className,
  autoFocus = false,
  initialQuery = "",
  initialFilters = {},
  onQueryChange,
}: UnifiedSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [searchMode] = useState<SearchMode>("keyword");
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>(initialFilters);

  const debouncedQuery = useDebounce(query, 500);

  // Perform search when query or filters change
  useEffect(() => {
    if (debouncedQuery || Object.keys(currentFilters).length > 0) {
      performSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, currentFilters]);

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim() && Object.keys(currentFilters).length === 0) {
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      await onSearch(debouncedQuery, searchMode, currentFilters);
      
      // Save to search history
      if (debouncedQuery.trim()) {
        await saveSearchToHistory({
          query: debouncedQuery,
          filters: currentFilters as Record<string, unknown>,
          searchType: dataSource,
          resultCount: 0, // This should be updated by the parent component
        });
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchError("An error occurred while searching. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, [debouncedQuery, searchMode, currentFilters, onSearch, dataSource]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onQueryChange?.(value);
  };


  const handleSearchFromHistory = (historyQuery: string, historyFilters?: Record<string, unknown>) => {
    setQuery(historyQuery);
    if (historyFilters) {
      setCurrentFilters(historyFilters);
    }
    setShowHistoryPanel(false);
  };

  const clearSearch = () => {
    setQuery("");
    setCurrentFilters({});
    setSearchError(null);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search Input */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => setShowHistoryPanel(true)}
            className="pl-10 pr-10"
            autoFocus={autoFocus}
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {filters && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-primary text-primary-foreground")}
          >
            <Filter className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filters */}
      {showFilters && filters}

      {/* Search History */}
      {showHistory && showHistoryPanel && (
        <SearchHistoryPanel
          onSearchSelect={handleSearchFromHistory}
          currentQuery={query}
          className="mt-2"
        />
      )}

      {/* Error Message */}
      {searchError && (
        <Alert variant="destructive">
          <AlertDescription>{searchError}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
            Searching...
          </div>
        </div>
      )}
    </div>
  );
}