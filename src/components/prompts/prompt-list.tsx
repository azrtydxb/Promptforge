"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { getPromptsByFolderRedis as getPromptsByFolder, getAllPromptsRedis as getAllPrompts } from "@/app/actions/prompt.actions.redis";
import type { PromptSort } from "@/app/actions/prompt.actions";
import { getTagsWithPrompts } from "@/app/actions/tag-management.actions";
import type { Prompt, Tag } from "@/generated/prisma";
import { useModal } from "@/hooks/use-modal-store";
import { LoadingStates } from "../ui/loading-state";
import { EmptyStates } from "../ui/empty-state";
import { PromptGrid, PromptGridItem } from "./prompt-grid";

type PromptWithTags = Prompt & {
  tags: Tag[];
  likeCount: number;
  isLikedByUser: boolean;
  favoriteCount: number;
  isFavoritedByUser: boolean;
};


interface PromptListProps {
  folderId?: string;
  tagId?: string;
  prompts?: PromptWithTags[];
  searchQuery?: string;
  selectedTagIds?: string[];
  selectedPromptIds?: string[];
  sort?: PromptSort;
  onToggleSelect?: (promptId: string) => void;
  onPromptsLoaded?: (prompts: PromptGridItem[]) => void;
}

export const PromptList = ({
  folderId,
  tagId,
  prompts: initialPrompts,
  searchQuery = "",
  selectedTagIds = [],
  selectedPromptIds = [],
  sort,
  onToggleSelect,
  onPromptsLoaded
}: PromptListProps) => {
  const [prompts, setPrompts] = useState<PromptWithTags[]>(initialPrompts || []);
  const [isLoading, setIsLoading] = useState(!initialPrompts);
  const [wasCreatePromptOpen, setWasCreatePromptOpen] = useState(false);
  const { isOpen, type } = useModal();

  // Filter prompts based on search query and selected tags
  const filteredPrompts = useMemo(() => {
    let filtered = prompts;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((prompt) => {
        const titleMatch = prompt.title.toLowerCase().includes(query);
        const descriptionMatch = prompt.description?.toLowerCase().includes(query) || false;
        return titleMatch || descriptionMatch;
      });
    }

    // Apply tag filter
    if (selectedTagIds.length > 0) {
      filtered = filtered.filter((prompt) => {
        const promptTags = prompt.tags ?? [];
        return selectedTagIds.some((tagId) =>
          promptTags.some((tag) => tag.id === tagId)
        );
      });
    }

    return filtered;
  }, [prompts, searchQuery, selectedTagIds]);

  // Pagination (mockup: 3-col grid → ~12 per page + ‹ 1 2 3 … N › control)
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedTagIds, folderId, tagId, prompts.length]);
  const totalPages = Math.max(1, Math.ceil(filteredPrompts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredPrompts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const fetchPrompts = useCallback(async () => {
    setIsLoading(true);
    try {
      if (tagId !== undefined) {
        // Fetch prompts by tag
        if (tagId === null) {
          // Show all prompts when "All Prompts" is selected
          const allPrompts = await getAllPrompts(sort);
          setPrompts(allPrompts as PromptWithTags[]);
          onPromptsLoaded?.(allPrompts as PromptGridItem[]);
        } else {
          // Show prompts for specific tag
          const tagsWithPrompts = await getTagsWithPrompts();
          const selectedTag = tagsWithPrompts.find(tag => tag.id === tagId);
          const fallbackTag = selectedTag
            ? {
                id: selectedTag.id,
                name: selectedTag.name,
                description: selectedTag.description,
                createdAt: selectedTag.createdAt,
                updatedAt: selectedTag.updatedAt,
              }
            : undefined;
          const promptsWithTags = (selectedTag?.prompts || []).map((prompt) => ({
            ...prompt,
            tags: prompt.tags ?? (fallbackTag ? [fallbackTag] : []),
          })) as PromptWithTags[];
          setPrompts(promptsWithTags);
          onPromptsLoaded?.(promptsWithTags as PromptGridItem[]);
        }
      } else if (folderId !== undefined) {
        const fetchedPrompts = await getPromptsByFolder(folderId, sort);
        setPrompts(fetchedPrompts as PromptWithTags[]);
        onPromptsLoaded?.(fetchedPrompts as PromptGridItem[]);
      } else if (initialPrompts) {
        setPrompts(initialPrompts);
        onPromptsLoaded?.(initialPrompts as PromptGridItem[]);
      } else {
        // "All" (no folder selected) — show every prompt, not just unassigned.
        const fetchedPrompts = await getAllPrompts(sort);
        setPrompts(fetchedPrompts as PromptWithTags[]);
        onPromptsLoaded?.(fetchedPrompts as PromptGridItem[]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [folderId, tagId, initialPrompts, sort, onPromptsLoaded]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  // Track when createPrompt modal is open
  useEffect(() => {
    if (isOpen && type === 'createPrompt') {
      setWasCreatePromptOpen(true);
    }
  }, [isOpen, type]);

  // Refresh prompts when createPrompt modal closes
  useEffect(() => {
    if (!isOpen && wasCreatePromptOpen) {
      setWasCreatePromptOpen(false);
      fetchPrompts();
    }
  }, [isOpen, wasCreatePromptOpen, fetchPrompts]);


  // Show loading state
  if (isLoading) {
    return <LoadingStates.CardGrid />;
  }

  // Show message when no prompts match the filters
  if (filteredPrompts.length === 0 && prompts.length > 0) {
    return <EmptyStates.NoSearchResults query={searchQuery || selectedTagIds.length > 0 ? searchQuery : undefined} />;
  }
  
  // Show empty state when no prompts exist
  if (prompts.length === 0) {
    return <EmptyStates.NoPrompts />;
  }

  return (
    <div>
      <PromptGrid
        prompts={pageItems}
        selectedPromptIds={selectedPromptIds}
        onToggleSelect={onToggleSelect}
      />

      {filteredPrompts.length > PAGE_SIZE && (
        <div className="mt-5 flex items-center justify-between">
          <span className="text-[12px] tabular-nums text-ink-400">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filteredPrompts.length)} of {filteredPrompts.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
              className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-line-200 text-ink-600 hover:bg-surface-muted disabled:opacity-40"
            >
              ‹
            </button>
            {getPageNumbers(safePage, totalPages).map((n, i) =>
              n === "…" ? (
                <span key={`e${i}`} className="px-1 text-[12px] text-ink-400">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n as number)}
                  className={
                    n === safePage
                      ? "flex h-7 min-w-7 items-center justify-center rounded-[7px] bg-accent-500 px-2 text-[12px] font-[550] text-white"
                      : "flex h-7 min-w-7 items-center justify-center rounded-[7px] border border-line-200 px-2 text-[12px] text-ink-600 hover:bg-surface-muted"
                  }
                >
                  {n}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
              className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-line-200 text-ink-600 hover:bg-surface-muted disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Build the ‹ 1 2 3 … N › page list (current ± 1, first, last, ellipses).
function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}
