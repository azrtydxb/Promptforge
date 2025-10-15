"use client";

import { useState, useEffect } from "react";
import { UnifiedSearch } from "@/components/search/unified-search";
import { useUnifiedSearch } from "@/hooks/use-unified-search";
import { PromptGrid } from "@/components/prompts/prompt-grid";
import { LoadingStates } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { getAllTags } from "@/app/actions/tag-management.actions";
import { getFolders } from "@/app/actions/folder.actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PromptsSearchPage() {
  const {
    results,
    isLoading,
    error,
    semanticSearchEnabled,
    performSearch,
    trackResultClick,
  } = useUnifiedSearch({
    dataSource: "prompts",
  });

  const [filters, setFilters] = useState({
    tags: [] as string[],
    folderId: null as string | null,
    hasEnhancement: false,
  });

  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string }>>([]);
  const [availableFolders, setAvailableFolders] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const [tags, folders] = await Promise.all([
        getAllTags(),
        getFolders(),
      ]);
      setAvailableTags(tags);
      setAvailableFolders(folders);
    } catch (error) {
      console.error("Error loading filter options:", error);
    }
  };

  const handleTagToggle = (tagId: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(id => id !== tagId)
        : [...prev.tags, tagId]
    }));
  };

  const removeTag = (tagId: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(id => id !== tagId)
    }));
  };

  const filtersComponent = (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="space-y-2">
        <Label>Folder</Label>
        <Select
          value={filters.folderId || "all"}
          onValueChange={(value) => setFilters(prev => ({
            ...prev,
            folderId: value === "all" ? null : value
          }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Folders</SelectItem>
            {availableFolders.map(folder => (
              <SelectItem key={folder.id} value={folder.id}>
                {folder.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {availableTags.map(tag => (
            <Badge
              key={tag.id}
              variant={filters.tags.includes(tag.id) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => handleTagToggle(tag.id)}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
        {filters.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {filters.tags.map(tagId => {
              const tag = availableTags.find(t => t.id === tagId);
              if (!tag) return null;
              return (
                <Badge key={tagId} variant="secondary" className="gap-1">
                  {tag.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-3 w-3 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTag(tagId);
                    }}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="enhanced-only">Enhanced prompts only</Label>
        <Switch
          id="enhanced-only"
          checked={filters.hasEnhancement}
          onCheckedChange={(checked) => setFilters(prev => ({
            ...prev,
            hasEnhancement: checked
          }))}
        />
      </div>
    </div>
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Search Prompts</h1>
          <p className="text-muted-foreground">
            Search through your prompts using {semanticSearchEnabled ? "AI-powered semantic search" : "keyword search"}
          </p>
        </div>

        <UnifiedSearch
          dataSource="prompts"
          onSearch={performSearch}
          onResultSelect={(prompt) => trackResultClick(prompt.id)}
          placeholder="Search your prompts..."
          filters={filtersComponent}
          showModeSelector={true}
          showHistory={true}
          semanticSearchEnabled={semanticSearchEnabled}
          onFiltersChange={setFilters}
        />

        {error && (
          <EmptyState
            icon="error"
            title="Search Error"
            description={error}
            action={{
              label: "Try Again",
              onClick: () => window.location.reload()
            }}
          />
        )}

        {isLoading ? (
          <LoadingStates.CardGrid />
        ) : results.length > 0 ? (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Found {results.length} prompts
            </p>
            <PromptGrid prompts={results} />
          </div>
        ) : (
          <EmptyState
            icon="search"
            title="No prompts found"
            description="Try adjusting your search query or filters"
          />
        )}
      </div>
    </div>
  );
}