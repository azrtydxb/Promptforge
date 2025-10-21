import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getFoldersRedis as getFolders } from '@/app/actions/folder.actions.redis';
import { getPromptsByFolderRedis as getPromptsByFolder, getAllPromptsRedis as getAllPrompts } from '@/app/actions/prompt.actions.redis';
import { getTagsWithPrompts } from '@/app/actions/tag-management.actions';
import { PromptsClientWrapper } from './prompts-client-wrapper';
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

// Helper function to get prompts for a specific tag - moved outside component
async function getPromptsForTag(tagId: string, allTags: Array<{ id: string; prompts?: unknown[] }>): Promise<PromptGridItem[]> {
  const selectedTag = allTags.find(tag => tag.id === tagId);
  if (!selectedTag) return [];

  return (selectedTag.prompts || []) as PromptGridItem[];
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
  const [foldersData, tagsData] = await Promise.all([
    getFolders(),
    getTagsWithPrompts()
  ]);

  // Fetch prompts based on view mode
  const initialPrompts = await (viewMode === 'folders'
    ? (folderId ? getPromptsByFolder(folderId) : getPromptsByFolder())
    : (tagId ? getPromptsForTag(tagId, tagsData) : getAllPrompts()));

  // Serialize folders to remove Date objects and make them client-safe
  const folders = JSON.parse(JSON.stringify(foldersData));
  const tags = JSON.parse(JSON.stringify(tagsData));
  const prompts = JSON.parse(JSON.stringify(initialPrompts));

  return (
    <PromptsClientWrapper
      initialPrompts={prompts}
      folders={folders}
      tags={tags}
      initialViewMode={viewMode}
      initialFolderId={folderId}
      initialTagId={tagId}
      initialSearchQuery={searchQuery}
      initialSelectedTagIds={selectedTagIds}
    />
  );
}

