"use client";

import { useState, useCallback } from "react";
import { UnifiedSearch } from "@/components/search/unified-search";
import { UnifiedPromptCardClean as UnifiedPromptCard } from "@/components/ui/unified-prompt-card-clean";
import { ResizablePanels } from "@/components/ui/resizable-panels";
import { getSharedPrompts } from "@/app/actions/shared-prompts.actions";
import { LoadingStates } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { MarketplaceFilters } from "@/components/marketplace/marketplace-filters";
import type { SearchMode, SearchFilters } from "@/components/search/unified-search";

interface SharedPromptsSearchProps {
  initialPrompts?: any[];
  semanticSearchEnabled?: boolean;
}

export function SharedPromptsSearch({ 
  initialPrompts = [],
  semanticSearchEnabled = false 
}: SharedPromptsSearchProps) {
  const [prompts, setPrompts] = useState(initialPrompts);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "liked" | "copied">("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handleSearch = useCallback(async (
    query: string, 
    mode: SearchMode, 
    filters: SearchFilters
  ) => {
    setIsLoading(true);
    try {
      const response = await getSharedPrompts({
        search: query,
        tags: filters.tags,
        sortBy,
        page: currentPage,
        limit: 20,
      });

      setPrompts(response.prompts);
      setTotalPages(Math.ceil(response.pagination.total / response.pagination.limit));
    } catch (error) {
      console.error("Error searching shared prompts:", error);
      setPrompts([]);
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, currentPage]);

  const handleSortChange = (newSort: typeof sortBy) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  const leftPanel = (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Shared Prompts</h1>
        <p className="text-muted-foreground">
          Discover and use prompts shared by the community
        </p>
      </div>

      <UnifiedSearch
        dataSource="shared"
        onSearch={handleSearch}
        placeholder="Search shared prompts..."
        showModeSelector={semanticSearchEnabled}
        showHistory={true}
        semanticSearchEnabled={semanticSearchEnabled}
      />

      <MarketplaceFilters
        onSortChange={handleSortChange}
        currentSort={sortBy}
      />

      {isLoading ? (
        <LoadingStates.PromptGrid />
      ) : prompts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {prompts.map((prompt) => (
            <UnifiedPromptCard
              key={prompt.id}
              id={prompt.id}
              title={prompt.title}
              description={prompt.description}
              content={prompt.content}
              type="shared"
              tags={prompt.prompt?.tags || []}
              isLiked={prompt.isLiked}
              isPublic={true}
              metrics={{
                likes: prompt.likeCount,
                views: prompt.viewCount,
                copies: prompt.copyCount,
                comments: prompt.commentCount,
              }}
              author={prompt.author}
              createdAt={prompt.publishedAt}
              updatedAt={prompt.publishedAt}
              onClick={() => setSelectedPrompt(prompt)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon="share"
          title="No shared prompts found"
          description="Try adjusting your search query"
        />
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );

  const rightPanel = selectedPrompt ? (
    <div className="p-6 bg-background rounded-lg border">
      <h2 className="text-2xl font-bold mb-4">{selectedPrompt.title}</h2>
      {selectedPrompt.description && (
        <p className="text-muted-foreground mb-4">{selectedPrompt.description}</p>
      )}
      <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg">
        {selectedPrompt.content}
      </pre>
    </div>
  ) : (
    <EmptyState
      icon="file"
      title="Select a prompt"
      description="Click on a prompt to view its details"
    />
  );

  return (
    <ResizablePanels
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      defaultSize={60}
    />
  );
}