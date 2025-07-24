"use client";

import { useState, useEffect } from "react";
import { Clock, TrendingUp, X, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getSearchHistory,
  getPopularSearches,
  deleteSearchHistory,
  getSuggestedSearches,
} from "@/app/actions/search-history.actions";
import type { SearchHistory } from "@/generated/prisma";
import { cn } from "@/lib/utils";

interface SearchHistoryPanelProps {
  onSearchSelect: (query: string, filters?: Record<string, unknown>) => void;
  currentQuery?: string;
  className?: string;
}

type SearchHistoryWithPrompt = SearchHistory & {
  clickedPrompt?: {
    id: string;
    title: string;
  } | null;
};

export function SearchHistoryPanel({ 
  onSearchSelect, 
  currentQuery = "",
  className 
}: SearchHistoryPanelProps) {
  const [recentSearches, setRecentSearches] = useState<SearchHistoryWithPrompt[]>([]);
  const [popularSearches, setPopularSearches] = useState<{ query: string; count: number }[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch search history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const [history, popular] = await Promise.all([
          getSearchHistory(10),
          getPopularSearches(5),
        ]);
        setRecentSearches(history as SearchHistoryWithPrompt[]);
        setPopularSearches(popular);
      } catch (error) {
        console.error("Error fetching search history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Fetch suggestions when query changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (currentQuery.length >= 2) {
        const suggested = await getSuggestedSearches(currentQuery, 5);
        setSuggestions(suggested);
      } else {
        setSuggestions([]);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [currentQuery]);

  const handleDeleteHistory = async (id?: string) => {
    await deleteSearchHistory(id);
    // Refresh history
    const history = await getSearchHistory(10);
    setRecentSearches(history as SearchHistoryWithPrompt[]);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className={cn("p-4 space-y-4", className)}>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-24" />
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-8 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search Suggestions */}
      {suggestions.length > 0 && currentQuery && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <SearchIcon className="h-4 w-4" />
            Suggestions
          </h3>
          <div className="space-y-1">
            {suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => onSearchSelect(suggestion)}
              >
                <span className="truncate">{suggestion}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Popular Searches */}
      {popularSearches.length > 0 && !currentQuery && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Popular Searches
          </h3>
          <div className="flex flex-wrap gap-2">
            {popularSearches.map((search, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => onSearchSelect(search.query)}
              >
                {search.query}
                <span className="ml-1 text-xs opacity-60">({search.count})</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recent Searches */}
      {recentSearches.length > 0 && !currentQuery && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Searches
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteHistory()}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Clear all
            </Button>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {recentSearches.map((search) => (
                <div
                  key={search.id}
                  className="group flex items-center gap-2 p-2 rounded hover:bg-muted/50"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start text-left p-0"
                    onClick={() => onSearchSelect(search.query, search.filters)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{search.query}</span>
                        {search.searchType !== "hybrid" && (
                          <Badge variant="outline" className="text-xs">
                            {search.searchType}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(search.createdAt)}</span>
                        {search.resultCount > 0 && (
                          <span>• {search.resultCount} results</span>
                        )}
                        {search.clickedPrompt && (
                          <span className="truncate">• Opened: {search.clickedPrompt.title}</span>
                        )}
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteHistory(search.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Empty State */}
      {recentSearches.length === 0 && popularSearches.length === 0 && !currentQuery && (
        <div className="text-center py-8 text-muted-foreground">
          <SearchIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No search history yet</p>
          <p className="text-xs mt-1">Your searches will appear here</p>
        </div>
      )}
    </div>
  );
}