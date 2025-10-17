import { Suspense } from 'react';
import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getFolders } from '@/app/actions/folder.actions.cached';
import { getPromptsByFolder, getAllPrompts } from '@/app/actions/prompt.actions';
import { getTagsWithPrompts } from '@/app/actions/tag-management.actions';
import { PromptsClientWrapper } from './prompts-client-wrapper';
import { LoadingStates } from '@/components/ui/loading-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { PromptGridItem } from '@/components/prompts/prompt-grid';

interface PageProps {
  searchParams: Promise<{
    folderId?: string;
    tagId?: string;
    search?: string;
    tags?: string;
    view?: 'folders' | 'tags';
  }>;
}

export default async function PromptsPage({ searchParams }: PageProps) {
  // Check authentication
  try {
    await requireAuth();
  } catch {
    redirect('/sign-in');
  }

  const params = await searchParams;

  // Parse search params
  const viewMode = params.view || 'folders';
  const folderId = params.folderId || null;
  const tagId = params.tagId || null;
  const searchQuery = params.search || '';
  const selectedTagIds = params.tags?.split(',').filter(Boolean) || [];

  // Fetch initial data in parallel
  const [folders, tagsData] = await Promise.all([
    getFolders(),
    getTagsWithPrompts()
  ]);

  // Fetch prompts based on view mode
  const initialPrompts = await (viewMode === 'folders'
    ? (folderId ? getPromptsByFolder(folderId) : getPromptsByFolder())
    : (tagId ? getPromptsForTag(tagId, tagsData) : getAllPrompts()));

  // Helper function to get prompts for a specific tag
  async function getPromptsForTag(tagId: string, allTags: Array<{ id: string; prompts?: unknown[] }>): Promise<PromptGridItem[]> {
    const selectedTag = allTags.find(tag => tag.id === tagId);
    if (!selectedTag) return [];

    return (selectedTag.prompts || []) as PromptGridItem[];
  }

  return (
    <Suspense fallback={<LoadingPageSkeleton />}>
      <PromptsClientWrapper
        initialPrompts={initialPrompts}
        folders={folders}
        tags={tagsData}
        initialViewMode={viewMode}
        initialFolderId={folderId}
        initialTagId={tagId}
        initialSearchQuery={searchQuery}
        initialSelectedTagIds={selectedTagIds}
      />
    </Suspense>
  );
}

function LoadingPageSkeleton() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <div className="w-[280px] border-r p-4">
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-4">
        <div className="mb-4">
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
        <LoadingStates.CardGrid count={6} />
      </div>
    </div>
  );
}