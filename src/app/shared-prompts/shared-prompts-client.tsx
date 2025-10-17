'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { UnifiedPromptCardClean as UnifiedPromptCard } from '@/components/ui/unified-prompt-card-clean';
import { getSharedPromptsCached as getSharedPrompts } from '@/app/actions/shared-prompts.actions.cached';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionErrorBoundary } from '@/components/error-boundary';
import { NetworkErrorFallback } from '@/components/error-boundary/error-fallbacks';

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

interface SharedPromptsClientProps {
  initialPrompts: SharedPrompt[];
  initialPagination: PaginationInfo | null;
  initialError: string | null;
  searchQuery: string;
  selectedTags: string[];
  sortBy: 'recent' | 'popular' | 'liked' | 'copied';
}

export function SharedPromptsClient({
  initialPrompts,
  initialPagination,
  initialError,
  searchQuery,
  selectedTags,
  sortBy
}: SharedPromptsClientProps) {
  const [prompts, setPrompts] = useState<SharedPrompt[]>(initialPrompts);
  const [pagination, setPagination] = useState<PaginationInfo | null>(initialPagination);
  const [error, setError] = useState<string | null>(initialError);
  const [isPending, startTransition] = useTransition();

  // Reset state when search params change
  useEffect(() => {
    setPrompts(initialPrompts);
    setPagination(initialPagination);
    setError(initialError);
  }, [initialPrompts, initialPagination, initialError]);

  const loadMore = useCallback(() => {
    if (!pagination?.hasNext || isPending) return;

    startTransition(async () => {
      try {
        const result = await getSharedPrompts({
          page: pagination.page + 1,
          limit: 12,
          search: searchQuery,
          tags: selectedTags,
          sortBy
        });

        if (result.success && result.prompts && result.pagination) {
          setPrompts(prev => [...prev, ...result.prompts]);
          setPagination(result.pagination);
          setError(null);
        } else {
          setError(result.error || 'Failed to load more prompts');
        }
      } catch (error) {
        console.error('Error loading more prompts:', error);
        setError('Failed to load more prompts');
      }
    });
  }, [pagination, isPending, searchQuery, selectedTags, sortBy]);

  const handleLikeToggle = useCallback((promptId: string, isLiked: boolean) => {
    setPrompts(prev => prev.map(prompt =>
      prompt.id === promptId
        ? {
            ...prompt,
            isLiked,
            likeCount: prompt.likeCount + (isLiked ? 1 : -1)
          }
        : prompt
    ));
  }, []);

  const handleCopy = useCallback((promptId: string) => {
    setPrompts(prev => prev.map(prompt =>
      prompt.id === promptId
        ? { ...prompt, copyCount: prompt.copyCount + 1 }
        : prompt
    ));
  }, []);

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await getSharedPrompts({
          page: 1,
          limit: 12,
          search: searchQuery,
          tags: selectedTags,
          sortBy
        });

        if (result.success && result.prompts && result.pagination) {
          setPrompts(result.prompts);
          setPagination(result.pagination);
          setError(null);
        } else {
          setError(result.error || 'Failed to refresh prompts');
        }
      } catch (error) {
        console.error('Error refreshing prompts:', error);
        setError('Failed to refresh prompts');
      }
    });
  }, [searchQuery, selectedTags, sortBy]);

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive mb-4">
          <p>{error}</p>
        </div>
        <Button
          variant="outline"
          onClick={refresh}
          disabled={isPending}
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
    <SectionErrorBoundary
      fallback={<NetworkErrorFallback onReset={refresh} />}
      resetKeys={[prompts.length, pagination?.page || 1]}
    >
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
              disabled={isPending}
            >
              {isPending ? (
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
    </SectionErrorBoundary>
  );
}