import { Suspense } from 'react';
import { getSharedPrompts, getAvailableSharedPromptTags } from '@/app/actions/shared-prompts.actions';
import { SharedPromptsClient } from './shared-prompts-client';
import { SharedPromptsFilters } from '@/components/marketplace/marketplace-filters-server';
import { ResizablePanels } from '@/components/ui/resizable-panels';
import { LoadingStates } from '@/components/ui/loading-state';
import { Share2 } from 'lucide-react';

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

  const renderFilterSidebar = () => (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2">
        <Share2 className="h-5 w-5 text-[#546ee5]" />
        <h2 className="text-lg font-bold text-foreground">Find Prompts</h2>
      </div>

      <SharedPromptsFilters
        searchQuery={searchQuery}
        selectedTags={selectedTags}
        sortBy={sortBy}
        availableTags={tagsResult.success ? tagsResult.tags : []}
      />
    </div>
  );

  return (
    <ResizablePanels
      leftPanel={renderFilterSidebar()}
      rightPanel={
        <div className="pb-4 px-4">
          <Suspense
            key={`${searchQuery}-${selectedTags.join(',')}-${sortBy}-${currentPage}`}
            fallback={
              <div className="space-y-6">
                <LoadingStates.CardGrid count={6} />
              </div>
            }
          >
            <SharedPromptsClient
              initialPrompts={promptsResult.success && promptsResult.prompts ? promptsResult.prompts : []}
              initialPagination={promptsResult.success && promptsResult.pagination ? promptsResult.pagination : null}
              initialError={!promptsResult.success ? (promptsResult.error || 'Failed to load prompts') : null}
              searchQuery={searchQuery}
              selectedTags={selectedTags}
              sortBy={sortBy}
            />
          </Suspense>
        </div>
      }
      defaultLeftWidth={280}
      minLeftWidth={200}
      maxLeftWidth={500}
    />
  );
}