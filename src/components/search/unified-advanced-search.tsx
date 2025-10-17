"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, Filter, X, Hash, FolderOpen, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PromptGrid } from "@/components/prompts/prompt-grid";
import { searchPromptsKeyword } from "@/app/actions/keyword-search.actions";
import { getAllTagsRedis as getAllTags } from "@/app/actions/tag.actions.redis";
import { getFoldersRedis as getFolders } from "@/app/actions/folder.actions.redis";
import { saveSearchToHistory, updateSearchClick } from "@/app/actions/search-history.actions";
import { SearchHistoryPanel } from "@/components/search/search-history-panel";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export type SearchMode = "keyword";

export interface SearchFilters {
  tags?: string[];
  folderId?: string | null;
  hasEnhancement?: boolean;
}

interface UnifiedAdvancedSearchProps {
  initialQuery?: string;
  initialFilters?: SearchFilters;
  onResultsChange?: (count: number) => void;
  onSearch?: (query: string, mode: SearchMode, filters: SearchFilters) => Promise<void>;
  showHistory?: boolean;
  showFilters?: boolean;
  showResults?: boolean;
  placeholder?: string;
  className?: string;
}

export function UnifiedAdvancedSearch({
  initialQuery = "",
  initialFilters = {},
  onResultsChange,
  onSearch,
  showHistory = true,
  showFilters = true,
  showResults = true,
  placeholder = "Search prompts...",
  className
}: UnifiedAdvancedSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    prompts: Array<{
      id: string;
      title: string;
      description: string | null;
      content: string | null;
      tags: Array<{ id: string; name: string }>;
      _count: {
        likes: number;
        favorites: number;
      };
    }>;
    templates?: Array<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      usageCount: number;
      rating: number | null;
    }>;
  }>({ prompts: [] });
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // Filters
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters.tags || []);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(initialFilters.folderId || null);
  const [includeEnhanced, setIncludeEnhanced] = useState(initialFilters.hasEnhancement || false);

  // Available options
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string }>>([]);
  const [availableFolders, setAvailableFolders] = useState<Array<{ id: string; name: string }>>([]);

  const debouncedQuery = useDebounce(query, 500);

  // Load available tags and folders
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [tags, folders] = await Promise.all([
          getAllTags(),
          getFolders(),
        ]);
        setAvailableTags(tags);
        setAvailableFolders(folders);
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };
    loadOptions();
  }, []);

  // Perform search
  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim() && selectedTags.length === 0) {
      setResults({ prompts: [] });
      onResultsChange?.(0);
      return;
    }

    setIsLoading(true);
    try {
      // If custom onSearch is provided, use it
      if (onSearch) {
        await onSearch(debouncedQuery, "keyword", {
          tags: selectedTags,
          folderId: selectedFolder,
          hasEnhancement: includeEnhanced || undefined,
        });
        return;
      }

      // Default search implementation - keyword only
      const searchResults = await searchPromptsKeyword({
        query: debouncedQuery,
        limit: 30,
        filters: {
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          folderId: selectedFolder,
          hasEnhancement: includeEnhanced || undefined
        }
      });

      setResults({ prompts: searchResults.prompts || [] });
      const totalCount = searchResults.total || 0;
      onResultsChange?.(totalCount);

      // Save to search history if there's a query
      if (debouncedQuery.trim()) {
        const historyResult = await saveSearchToHistory({
          query: debouncedQuery,
          searchType: "keyword",
          filters: {
            tags: selectedTags,
            folder: selectedFolder,
            includeEnhanced,
          },
          resultCount: totalCount,
        });

        if (historyResult.success && historyResult.searchEntry) {
          setCurrentSearchId(historyResult.searchEntry.id);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults({ prompts: [] });
      onResultsChange?.(0);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, selectedTags, selectedFolder, includeEnhanced, onResultsChange, onSearch]);

  // Trigger search when parameters change
  useEffect(() => {
    performSearch();
  }, [performSearch]);

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handlePromptClick = async (promptId: string) => {
    if (currentSearchId) {
      await updateSearchClick(currentSearchId, promptId);
    }
  };

  const handleHistorySelect = (historyQuery: string, filters?: Record<string, unknown>) => {
    setQuery(historyQuery);
    if (filters) {
      setSelectedTags((filters.tags as string[]) || []);
      setSelectedFolder((filters.folder as string) || null);
      setIncludeEnhanced((filters.includeEnhanced as boolean) || false);
    }
    setShowHistoryPanel(false);
  };

  const clearSearch = () => {
    setQuery("");
    setSelectedTags([]);
    setSelectedFolder(null);
    setIncludeEnhanced(false);
  };

  const activeFiltersCount =
    selectedTags.length +
    (selectedFolder ? 1 : 0) +
    (includeEnhanced ? 1 : 0);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowHistoryPanel(true)}
          placeholder={placeholder}
          className="pl-10 pr-32"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearSearch}
              className="h-7 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {showHistory && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className="h-7 px-2"
              title="Search history"
            >
              <Clock className="h-3 w-3" />
            </Button>
          )}
          {showFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={cn(
                "h-7 gap-1",
                activeFiltersCount > 0 && "text-primary"
              )}
            >
              <Filter className="h-3 w-3" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Search History Panel */}
      {showHistory && showHistoryPanel && (
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 z-10 rounded-lg border bg-background shadow-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Search History</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowHistoryPanel(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SearchHistoryPanel
              onSearchSelect={handleHistorySelect}
              currentQuery={query}
            />
          </div>
        </div>
      )}


      {/* Filters Panel */}
      {showFilters && showFiltersPanel && (
        <div className="rounded-lg border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Search Filters</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedTags([]);
                setSelectedFolder(null);
                setIncludeEnhanced(false);
              }}
            >
              Clear All
            </Button>
          </div>

          {/* Tags Filter */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag.name)}
                >
                  <Hash className="mr-1 h-3 w-3" />
                  {tag.name}
                  {selectedTags.includes(tag.name) && <X className="ml-1 h-3 w-3" />}
                </Badge>
              ))}
            </div>
          </div>

          {/* Folder Filter */}
          <div className="space-y-2">
            <Label>Folder</Label>
            <Select
              value={selectedFolder || ""}
              onValueChange={(v) => setSelectedFolder(v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All folders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All folders</SelectItem>
                {availableFolders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      {folder.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="enhanced">Only enhanced prompts</Label>
              <Switch
                id="enhanced"
                checked={includeEnhanced}
                onCheckedChange={setIncludeEnhanced}
              />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : (
            <>
              {/* Prompts Results */}
              {results.prompts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">
                    Prompts ({results.prompts.length})
                  </h3>
                  <PromptGrid
                    prompts={results.prompts.map((p) => ({
                      id: p.id,
                      title: p.title,
                      description: p.description,
                      content: p.content,
                      userId: "",
                      folderId: null,
                      order: null,
                      lastUsedAt: null,
                      pinnedAt: null,
                      enhancedContent: null,
                      enhancementSuggestions: null,
                      autoTags: [],
                      embedding: null,
                      embeddingVersion: 1,
                      embeddingOutdated: false,
                      templateId: null,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      tags: p.tags,
                      _count: p._count,
                    } as unknown as Parameters<typeof PromptGrid>[0]["prompts"][number]))}
                    showFavoriteButton={true}
                    onPromptClick={handlePromptClick}
                  />
                </div>
              )}

              {/* No Results */}
              {!isLoading &&
                results.prompts.length === 0 &&
                debouncedQuery && (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No results found</h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search query or filters
                    </p>
                  </div>
                )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
