"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, Filter, X, Sparkles, Hash, FolderOpen, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PromptGrid } from "@/components/prompts/prompt-grid";
import { searchPrompts, searchPromptsHybrid, triggerEmbeddingUpdate } from "@/app/actions/search.actions";
import { getAllTags } from "@/app/actions/tag-management.actions";
import { getFolders } from "@/app/actions/folder.actions";
import { canUseSemanticSearch } from "@/app/actions/semantic-search.actions";
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
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface AdvancedSearchProps {
  initialQuery?: string;
  onResultsChange?: (count: number) => void;
}

export function AdvancedSearch({ initialQuery = "", onResultsChange }: AdvancedSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [searchMode, setSearchMode] = useState<"semantic" | "hybrid" | "keyword">("hybrid");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ prompts: unknown[]; templates?: unknown[] }>({ prompts: [], templates: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [embeddingStatus, setEmbeddingStatus] = useState<{ message: string; type: "info" | "success" | "error" } | null>(null);
  const [semanticSearchAvailable, setSemanticSearchAvailable] = useState<{
    enabled: boolean;
    hasEmbeddings: boolean;
    message?: string;
  }>({ enabled: false, hasEmbeddings: false });
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // Filters
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [includeEnhanced, setIncludeEnhanced] = useState(false);
  const [includeTemplates, setIncludeTemplates] = useState(false);
  const [threshold, setThreshold] = useState(0.7);
  const [keywordWeight, setKeywordWeight] = useState(0.3);
  
  // Available options
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string }>>([]);
  const [availableFolders, setAvailableFolders] = useState<Array<{ id: string; name: string }>>([]);
  
  const debouncedQuery = useDebounce(query, 500);

  // Load available tags and folders
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [tags, folders, semanticStatus] = await Promise.all([
          getAllTags(),
          getFolders(),
          canUseSemanticSearch()
        ]);
        setAvailableTags(tags);
        setAvailableFolders(folders);
        setSemanticSearchAvailable(semanticStatus);
        
        // If semantic search is not available, switch to keyword mode
        if (!semanticStatus.enabled && searchMode !== "keyword") {
          setSearchMode("keyword");
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
      }
    };
    loadOptions();
  }, [searchMode]);

  // Perform search
  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim() && selectedTags.length === 0) {
      setResults({ prompts: [], templates: [] });
      onResultsChange?.(0);
      return;
    }

    setIsLoading(true);
    try {
      const searchOptions = {
        query: debouncedQuery,
        limit: 30,
        threshold,
        includeTemplates: searchMode !== "keyword" && includeTemplates,
        filters: {
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          folderId: selectedFolder,
          hasEnhancement: includeEnhanced || undefined
        }
      };

      let searchResults;
      if (searchMode === "semantic") {
        searchResults = await searchPrompts(searchOptions);
      } else if (searchMode === "hybrid") {
        searchResults = await searchPromptsHybrid({
          ...searchOptions,
          keywordWeight
        });
      } else {
        // For keyword search, we'll use hybrid with high keyword weight
        searchResults = await searchPromptsHybrid({
          ...searchOptions,
          keywordWeight: 0.9
        });
      }

      setResults(searchResults);
      const totalCount = searchResults.prompts.length + (searchResults.templates?.length || 0);
      onResultsChange?.(totalCount);
      
      // Save to search history if there's a query
      if (debouncedQuery.trim()) {
        const historyResult = await saveSearchToHistory({
          query: debouncedQuery,
          searchType: searchMode,
          filters: {
            tags: selectedTags,
            folder: selectedFolder,
            includeEnhanced,
            includeTemplates,
            threshold,
            keywordWeight,
          },
          resultCount: totalCount,
        });
        
        if (historyResult.success && historyResult.searchEntry) {
          setCurrentSearchId(historyResult.searchEntry.id);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults({ prompts: [], templates: [] });
      onResultsChange?.(0);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedQuery, searchMode, selectedTags, selectedFolder, includeEnhanced, includeTemplates, threshold, keywordWeight, onResultsChange]);

  // Trigger search when parameters change
  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Handle embedding update
  const handleUpdateEmbeddings = async () => {
    setEmbeddingStatus({ message: "Updating embeddings...", type: "info" });
    try {
      const result = await triggerEmbeddingUpdate();
      setEmbeddingStatus({
        message: result.message,
        type: "success"
      });
      // Auto-hide success message
      setTimeout(() => setEmbeddingStatus(null), 5000);
    } catch {
      setEmbeddingStatus({
        message: "Failed to update embeddings",
        type: "error"
      });
    }
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  // Handle prompt click to track in history
  const handlePromptClick = async (promptId: string) => {
    if (currentSearchId) {
      await updateSearchClick(currentSearchId, promptId);
    }
  };

  // Handle search selection from history
  const handleHistorySelect = (historyQuery: string, filters?: Record<string, unknown>) => {
    setQuery(historyQuery);
    if (filters) {
      setSelectedTags((filters.tags as string[]) || []);
      setSelectedFolder((filters.folder as string) || null);
      setIncludeEnhanced((filters.includeEnhanced as boolean) || false);
      setIncludeTemplates((filters.includeTemplates as boolean) || false);
      setThreshold((filters.threshold as number) || 0.7);
      setKeywordWeight((filters.keywordWeight as number) || 0.3);
    }
    setShowHistory(false);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowHistory(true)}
          placeholder="Search prompts semantically..."
          className="pl-10 pr-32"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowHistory(!showHistory)}
            className="h-7 px-2"
            title="Search history"
          >
            <Clock className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-7 gap-1",
              (selectedTags.length > 0 || selectedFolder || includeEnhanced) && "text-primary"
            )}
          >
            <Filter className="h-3 w-3" />
            Filters
            {(selectedTags.length > 0 || selectedFolder || includeEnhanced) && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                {selectedTags.length + (selectedFolder ? 1 : 0) + (includeEnhanced ? 1 : 0)}
              </Badge>
            )}
          </Button>
        </div>
      </div>
      
      {/* Search History Panel */}
      {showHistory && (
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 z-10 rounded-lg border bg-background shadow-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Search History</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowHistory(false)}
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

      {/* Search Mode Tabs */}
      <div className="space-y-4">
        <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as "semantic" | "hybrid" | "keyword")}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger 
              value="semantic" 
              className="gap-2"
              disabled={!semanticSearchAvailable.enabled}
            >
              <Sparkles className="h-4 w-4" />
              Semantic
            </TabsTrigger>
            <TabsTrigger 
              value="hybrid" 
              className="gap-2"
              disabled={!semanticSearchAvailable.enabled}
            >
              <Search className="h-4 w-4" />
              Hybrid
            </TabsTrigger>
            <TabsTrigger value="keyword" className="gap-2">
              <Hash className="h-4 w-4" />
              Keyword
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Semantic Search Status Alert */}
        {!semanticSearchAvailable.enabled && (
          <Alert>
            <AlertDescription>
              {semanticSearchAvailable.message || "Semantic search is currently disabled. Using keyword search only."}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
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
              {availableTags.map(tag => (
                <Badge
                  key={tag.id}
                  variant={selectedTags.includes(tag.name) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleTag(tag.name)}
                >
                  <Hash className="mr-1 h-3 w-3" />
                  {tag.name}
                  {selectedTags.includes(tag.name) && (
                    <X className="ml-1 h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Folder Filter */}
          <div className="space-y-2">
            <Label>Folder</Label>
            <Select value={selectedFolder || ""} onValueChange={(v) => setSelectedFolder(v || null)}>
              <SelectTrigger>
                <SelectValue placeholder="All folders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All folders</SelectItem>
                {availableFolders.map(folder => (
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
            
            {searchMode !== "keyword" && (
              <div className="flex items-center justify-between">
                <Label htmlFor="templates">Include templates</Label>
                <Switch
                  id="templates"
                  checked={includeTemplates}
                  onCheckedChange={setIncludeTemplates}
                />
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          {searchMode !== "keyword" && (
            <div className="space-y-3 pt-3 border-t">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Similarity Threshold</Label>
                  <span className="text-sm text-muted-foreground">{threshold.toFixed(2)}</span>
                </div>
                <Slider
                  value={[threshold]}
                  onValueChange={([v]) => setThreshold(v)}
                  min={0.5}
                  max={0.95}
                  step={0.05}
                  className="w-full"
                />
              </div>

              {searchMode === "hybrid" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Keyword Weight</Label>
                    <span className="text-sm text-muted-foreground">{keywordWeight.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[keywordWeight]}
                    onValueChange={([v]) => setKeywordWeight(v)}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Embedding Status */}
      {embeddingStatus && (
        <Alert className={cn(
          embeddingStatus.type === "error" && "border-destructive",
          embeddingStatus.type === "success" && "border-green-500"
        )}>
          <AlertDescription>{embeddingStatus.message}</AlertDescription>
        </Alert>
      )}

      {/* Update Embeddings Button */}
      {searchMode !== "keyword" && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUpdateEmbeddings}
            disabled={embeddingStatus?.type === "info"}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Update Embeddings
          </Button>
        </div>
      )}

      {/* Results */}
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
                  prompts={results.prompts as any}
                  showFavoriteButton={true}
                  onPromptClick={handlePromptClick}
                />
              </div>
            )}

            {/* Templates Results */}
            {results.templates && results.templates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-medium">
                  Templates ({results.templates.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(results.templates as any)?.map((template: { id: string; name: string; description?: string; category: string; similarity: number }) => (
                    <div
                      key={template.id}
                      className="rounded-lg border p-4 hover:shadow-md transition-shadow"
                    >
                      <h4 className="font-medium">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="secondary">{template.category}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {(template.similarity * 100).toFixed(0)}% match
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {!isLoading && results.prompts.length === 0 && (!results.templates || results.templates.length === 0) && debouncedQuery && (
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
    </div>
  );
}