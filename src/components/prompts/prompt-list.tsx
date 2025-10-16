"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { getPromptsByFolder, getAllPrompts } from "@/app/actions/prompt.actions";
import { getTagsWithPrompts } from "@/app/actions/tag-management.actions";
import type { Prompt, Tag } from "@/generated/prisma";
import { useModal } from "@/hooks/use-modal-store";
import { LoadingStates } from "../ui/loading-state";
import { EmptyStates } from "../ui/empty-state";
import { PromptGrid } from "./prompt-grid";

type PromptWithTags = Prompt & {
  tags: Tag[];
  likeCount: number;
  isLikedByUser: boolean;
  favoriteCount?: number;
  isFavoritedByUser?: boolean;
};


interface PromptListProps {
  folderId?: string;
  tagId?: string;
  prompts?: PromptWithTags[];
  searchQuery?: string;
  selectedTagIds?: string[];
}

export const PromptList = ({
  folderId,
  tagId,
  prompts: initialPrompts,
  searchQuery = "",
  selectedTagIds = []
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

  const fetchPrompts = useCallback(async () => {
    setIsLoading(true);
    try {
      if (tagId !== undefined) {
        // Fetch prompts by tag
        if (tagId === null) {
          // Show all prompts when "All Prompts" is selected
          const allPrompts = await getAllPrompts();
          setPrompts(allPrompts as PromptWithTags[]);
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
        }
      } else if (folderId !== undefined) {
        const fetchedPrompts = await getPromptsByFolder(folderId);
        setPrompts(fetchedPrompts as PromptWithTags[]);
      } else if (initialPrompts) {
        setPrompts(initialPrompts);
      } else {
        // Get unassigned prompts (folderId is null)
        const fetchedPrompts = await getPromptsByFolder();
        setPrompts(fetchedPrompts as PromptWithTags[]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [folderId, tagId, initialPrompts]);

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
      <PromptGrid prompts={filteredPrompts} />
    </div>
  );
};
