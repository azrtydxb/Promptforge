import { getSharedPromptsCached as getSharedPrompts } from '@/app/actions/shared-prompts.actions.cached';
import { getAvailableSharedPromptTags } from '@/app/actions/shared-prompts.actions';
import { SharedPromptsClient, type SharedPrompt } from './shared-prompts-client';

export const dynamic = 'force-dynamic';

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

  const popularTags = tagsResult.success && tagsResult.tags
    ? tagsResult.tags.slice(0, 10).map((t) => t.name)
    : [];

  return (
    <SharedPromptsClient
      key={`${searchQuery}-${selectedTags.join(',')}-${sortBy}-${currentPage}`}
      initialPrompts={promptsResult.success && promptsResult.prompts ? (promptsResult.prompts as unknown as SharedPrompt[]) : []}
      initialPagination={promptsResult.success && promptsResult.pagination ? promptsResult.pagination : null}
      initialError={!promptsResult.success ? (promptsResult.error || 'Failed to load prompts') : null}
      searchQuery={searchQuery}
      selectedTags={selectedTags}
      sortBy={sortBy}
      popularTags={popularTags}
    />
  );
}