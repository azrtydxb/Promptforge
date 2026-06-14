import { Suspense } from 'react';
import { getSharedPromptsCached as getSharedPrompts } from '@/app/actions/shared-prompts.actions.cached';
import { getAvailableSharedPromptTags } from '@/app/actions/shared-prompts.actions';
import { SharedPromptsClient, type SharedPrompt } from './shared-prompts-client';
import { LoadingStates } from '@/components/ui/loading-state';

interface PageProps {
  searchParams: Promise<{
    search?: string;
    tags?: string;
    sort?: 'recent' | 'popular' | 'liked' | 'copied';
    page?: string;
  }>;
}

export default async function SharedPromptsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Parse search params
  const currentPage = parseInt(params.page || '1', 10);
  const selectedTags = params.tags?.split(',').filter(Boolean) || [];
  const sortBy = params.sort || 'recent';
  const searchQuery = params.search || '';

  // Fetch data in parallel
  const [promptsResult, tagsResult] = await Promise.all([
    getSharedPrompts({
      page: currentPage,
      limit: 12,
      search: searchQuery,
      tags: selectedTags,
      sortBy
    }),
    getAvailableSharedPromptTags()
  ]);

  // tagsResult kept for parity with the action signature; the client renders its own
  // Structured Pro filter rail (Sort by / Category / Min rating / Popular tags).
  void tagsResult;

  return (
    <Suspense
      key={`${searchQuery}-${selectedTags.join(',')}-${sortBy}-${currentPage}`}
      fallback={<LoadingStates.CardGrid count={6} />}
    >
      <SharedPromptsClient
        initialPrompts={promptsResult.success && promptsResult.prompts ? (promptsResult.prompts as unknown as SharedPrompt[]) : []}
        initialPagination={promptsResult.success && promptsResult.pagination ? promptsResult.pagination : null}
        initialError={!promptsResult.success ? (promptsResult.error || 'Failed to load prompts') : null}
        searchQuery={searchQuery}
        selectedTags={selectedTags}
        sortBy={sortBy}
      />
    </Suspense>
  );
}