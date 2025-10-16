"use client";

import { MarketplaceFilters } from '@/components/marketplace/marketplace-filters';
import { UnifiedPromptCardClean as UnifiedPromptCard } from '@/components/ui/unified-prompt-card-clean';
import { ResizablePanels } from '@/components/ui/resizable-panels';
import { useState, useEffect, useCallback } from 'react';
import { getSharedPrompts, getAvailableSharedPromptTags, initializeMarketplace } from '@/app/actions/shared-prompts.actions';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  RefreshCw,
  Share2
} from 'lucide-react';
import { SectionErrorBoundary } from '@/components/error-boundary';
import { NetworkErrorFallback } from '@/components/error-boundary/error-fallbacks';
import { LoadingStates } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';

interface SharedPrompt {
  id: string;
  promptId: string;
  title: string;
  description?: string | null;
  content: string;
  publishedAt: Date | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  copyCount: number;
  isLiked?: boolean;
  author: {
    id: string;
    username: string | null;
    name: string | null;
    avatarType: string;
    profilePicture: string | null;
  };
  prompt: {
    tags: Array<{
      id: string;
      name: string;
    }>;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function SharedPromptsPage() {
  const [prompts, setPrompts] = useState<SharedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'liked' | 'copied'>('recent');
  const [availableTags, setAvailableTags] = useState<Array<{ id: string; name: string; count: number }>>([]);

  // Initialize marketplace on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeMarketplace();
      } catch (error) {
        console.error('Error initializing marketplace:', error);
      }
    };
    initialize();
  }, []);

  // Load prompts
  const loadPrompts = useCallback(async (page = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const result = await getSharedPrompts({
        page,
        limit: 12,
        search: searchQuery,
        tags: selectedTags,
        sortBy
      });

      if (result.success && result.prompts && result.pagination) {
        if (append) {
          setPrompts(prev => [...prev, ...result.prompts]);
        } else {
          setPrompts(result.prompts);
        }
        setPagination(result.pagination);
        setError(null);
      } else {
        setError(result.error || 'Failed to load prompts');
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
      setError('Failed to load prompts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedTags, sortBy]);

  // Load more prompts for pagination
  const loadMore = () => {
    if (pagination?.hasNext && !loadingMore) {
      loadPrompts(pagination.page + 1, true);
    }
  };

  // Filter change handlers
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSortChange = (sort: 'recent' | 'popular' | 'liked' | 'copied') => {
    setSortBy(sort);
  };

  // Load prompts when filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadPrompts(1, false);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedTags, sortBy, loadPrompts]);

  // Initial load
  useEffect(() => {
    const initializeData = async () => {
      loadPrompts();

      // Fetch available tags from database
      const tagsResult = await getAvailableSharedPromptTags();
      if (tagsResult.success) {
        setAvailableTags(tagsResult.tags);
      }
    };

    initializeData();
  }, [loadPrompts]);

  const handleLikeToggle = (promptId: string, isLiked: boolean) => {
    setPrompts(prev => prev.map(prompt => 
      prompt.id === promptId 
        ? { 
            ...prompt, 
            isLiked, 
            likeCount: prompt.likeCount + (isLiked ? 1 : -1) 
          }
        : prompt
    ));
  };

  const handleCopy = (promptId: string) => {
    setPrompts(prev => prev.map(prompt => 
      prompt.id === promptId 
        ? { ...prompt, copyCount: prompt.copyCount + 1 }
        : prompt
    ));
  };

  const renderFilterSidebar = () => (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <Share2 className="h-5 w-5 text-[#546ee5]" />
        <h2 className="text-lg font-bold text-foreground">Find Prompts</h2>
      </div>

      <MarketplaceFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        selectedTags={selectedTags}
        onTagToggle={handleTagToggle}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        availableTags={availableTags}
      />
    </div>
  );

  const renderMainContent = () => {
    if (loading && prompts.length === 0) {
      return (
        <div className="space-y-6">
          <LoadingStates.CardGrid count={6} />
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="text-destructive mb-4">
            <p>{error}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => loadPrompts()} 
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      );
    }

    if (prompts.length === 0) {
      return (
        <div className="space-y-6">
          <EmptyState
            type={searchQuery || selectedTags.length > 0 ? "noResults" : "noData"}
            title="No prompts found"
            description={
              searchQuery || selectedTags.length > 0
                ? 'Try adjusting your search or filters'
                : 'Be the first to share a prompt with the community!'
            }
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header with stats */}
        {pagination && (
          <div className="flex items-center justify-end">
            <div className="text-sm text-muted-foreground">
              {pagination.total} prompts
            </div>
          </div>
        )}

        {/* Prompts Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {prompts.map((prompt) => (
            <UnifiedPromptCard
              key={prompt.id}
              variant="shared"
              data={prompt}
              onLikeToggle={handleLikeToggle}
              onCopy={handleCopy}
            />
          ))}
        </div>

        {/* Load More */}
        {pagination?.hasNext && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                `Load More (${pagination.total - prompts.length} remaining)`
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <SectionErrorBoundary 
      fallback={<NetworkErrorFallback onReset={loadPrompts} />}
      resetKeys={[searchQuery, selectedTags.join(','), sortBy]}
    >
      <ResizablePanels
        leftPanel={
          <SectionErrorBoundary fallback={<NetworkErrorFallback />}>
            {renderFilterSidebar()}
          </SectionErrorBoundary>
        }
        rightPanel={
          <div className="pb-4 px-4">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">Community Prompts</h1>
              <p className="text-muted-foreground mt-1">Discover and share prompts with the community</p>
            </div>
            <SectionErrorBoundary 
              fallback={<NetworkErrorFallback onReset={loadPrompts} />}
              resetKeys={[prompts.length, pagination?.page || 1]}
            >
              {renderMainContent()}
            </SectionErrorBoundary>
          </div>
        }
        defaultLeftWidth={280}
        minLeftWidth={200}
        maxLeftWidth={500}
      />
    </SectionErrorBoundary>
  );
}