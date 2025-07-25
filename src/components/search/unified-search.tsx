"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, Filter, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { SearchHistoryPanel } from "@/components/search/search-history-panel";
import { saveSearchToHistory } from "@/app/actions/search-history.actions";

export type SearchDataSource = "prompts" | "templates" | "shared" | "all";
export type SearchMode = "semantic" | "hybrid" | "keyword";

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
  onSearch: (query: string, mode: SearchMode, filters: SearchFilters) => Promise<any>;
  onResultSelect?: (result: any) => void;
  placeholder?: string;
  filters?: React.ReactNode;
  showModeSelector?: boolean;
  showHistory?: boolean;
  semanticSearchEnabled?: boolean;
  className?: string;
  autoFocus?: boolean;
  initialQuery?: string;
  initialFilters?: SearchFilters;
  onQueryChange?: (query: string) => void;
  onFiltersChange?: (filters: SearchFilters) => void;
}

export function UnifiedSearch({
  dataSource,
  onSearch,
  onResultSelect,
  placeholder = "Search...",
  filters,
  showModeSelector = true,
  showHistory = true,
  semanticSearchEnabled = false,
  className,
  autoFocus = false,
  initialQuery = "",
  initialFilters = {},
  onQueryChange,
  onFiltersChange,
}: UnifiedSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [searchMode, setSearchMode] = useState<SearchMode>(
    semanticSearchEnabled ? "hybrid" : "keyword"
  );
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<SearchFilters>(initialFilters);
  
  const debouncedQuery = useDebounce(query, 500);

  // Update search mode when semantic search is toggled
  useEffect(() => {
    if (!semanticSearchEnabled && searchMode !== "keyword") {
      setSearchMode("keyword");
    }
  }, [semanticSearchEnabled, searchMode]);

  // Perform search when query or filters change
  useEffect(() => {
    if (debouncedQuery || Object.keys(currentFilters).length > 0) {
      performSearch();
    }
  }, [debouncedQuery, currentFilters, searchMode]);

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
          filters: currentFilters as any,
          searchType: dataSource,
          resultsCount: 0, // This should be updated by the parent component
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("An error occurred while searching. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }, [debouncedQuery, searchMode, currentFilters, onSearch, dataSource]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onQueryChange?.(value);
  };

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setCurrentFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const handleSearchFromHistory = (historyQuery: string, historyFilters?: any) => {
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

      {/* Search Mode Selector */}
      {showModeSelector && semanticSearchEnabled && (
        <div className="flex items-center gap-4">
          <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as SearchMode)}>
            <TabsList>
              <TabsTrigger value="keyword">Keyword</TabsTrigger>
              <TabsTrigger value="hybrid">
                <Sparkles className="h-3 w-3 mr-1" />
                Hybrid
              </TabsTrigger>
              <TabsTrigger value="semantic">
                <Sparkles className="h-3 w-3 mr-1" />
                Semantic
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {searchMode !== "keyword" && (
            <div className="text-sm text-muted-foreground">
              Using AI-powered search
            </div>
          )}
        </div>
      )}

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