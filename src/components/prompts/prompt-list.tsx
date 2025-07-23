"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Icons } from "../ui/icons";
import { Button } from "../ui/button";
import { getPromptsByFolder, movePrompt, togglePromptLike } from "@/app/actions/prompt.actions";
import type { Prompt, Tag } from "@/generated/prisma";
import Link from "next/link";
import { useModal } from "@/hooks/use-modal-store";
import { stickyNoteCard } from "@/lib/styles";
import { SkeletonPromptCard } from "../ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type PromptWithTags = Prompt & {
  tags: Tag[];
  likeCount: number;
  isLikedByUser: boolean;
};

const PromptItem = ({ prompt, onConfirm }: { prompt: PromptWithTags, onConfirm: () => void }) => {
  const { onOpen } = useModal();
  const [isLiking, setIsLiking] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(prompt.likeCount);
  const [localIsLiked, setLocalIsLiked] = useState(prompt.isLikedByUser);
  const [showAllTags, setShowAllTags] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prompt.id });

  // Generate consistent color based on prompt ID
  const colors: Array<'yellow' | 'blue' | 'green' | 'pink' | 'orange'> = ['yellow', 'blue', 'green', 'pink', 'orange'];
  const colorIndex = prompt.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const stickyColor = colors[colorIndex];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Truncate description to show a snippet
  const getDescriptionSnippet = (description: string | null) => {
    if (!description) return "No description available...";
    const maxLength = 300;
    return description.length > maxLength
      ? description.substring(0, maxLength) + "..."
      : description;
  };

  // Handle like toggle with optimistic updates
  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLiking) return;
    
    setIsLiking(true);
    
    // Optimistic update
    const newIsLiked = !localIsLiked;
    const newLikeCount = newIsLiked ? localLikeCount + 1 : localLikeCount - 1;
    
    setLocalIsLiked(newIsLiked);
    setLocalLikeCount(newLikeCount);
    
    try {
      await togglePromptLike(prompt.id);
    } catch (error) {
      // Revert optimistic update on error
      setLocalIsLiked(localIsLiked);
      setLocalLikeCount(localLikeCount);
      console.error("Failed to toggle like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  // Handle share functionality
  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: prompt.title,
          text: prompt.description || "Check out this prompt!",
          url: `${window.location.origin}/prompts/${prompt.id}`,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${window.location.origin}/prompts/${prompt.id}`);
        // You could add a toast notification here
        console.log("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="mb-6"
    >
      <Link href={`/prompts/${prompt.id}`} className="block" aria-label={`View prompt: ${prompt.title}`}>
        <article className={stickyNoteCard(stickyColor, "group relative cursor-pointer flex flex-col")} role="article">
          {/* Sticky note header with title, like/share buttons, and menu */}
          <div className="flex justify-between items-start mb-3 flex-shrink-0">
            <div
              className="flex-grow text-lg font-medium text-gray-800 hover:text-dell-blue-600 transition-colors line-clamp-2 mr-2"
              {...listeners}
            >
              {prompt.title}
            </div>
          
          {/* Right side buttons: Like, Share, Menu */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Like button */}
            <button
              onClick={handleLikeToggle}
              disabled={isLiking}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                localIsLiked
                  ? 'bg-white/90 text-red-500 shadow-md'
                  : 'bg-white/80 text-gray-600 hover:bg-white hover:shadow-md'
              } ${isLiking ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
              title={`${localLikeCount} likes`}
              aria-label={localIsLiked ? 'Unlike this prompt' : 'Like this prompt'}
              aria-pressed={localIsLiked}
            >
              <Icons.Heart className={`h-3 w-3 ${localIsLiked ? 'fill-current' : ''}`} aria-hidden="true" />
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              className="w-6 h-6 rounded-full bg-white/80 text-gray-600 hover:bg-white hover:shadow-md flex items-center justify-center transition-all duration-200 hover:scale-110"
              title="Share this prompt"
              aria-label="Share this prompt"
            >
              <Icons.Share2 className="h-3 w-3" aria-hidden="true" />
            </button>

            {/* Menu button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  aria-label="More prompt options"
                >
                  <Icons.MoreVertical className="h-3 w-3" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white z-50">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpen("renamePrompt", { prompt });
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpen("movePrompt", { prompt });
                  }}
                >
                  Move to Folder
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpen("deletePrompt", { prompt, onConfirm });
                  }}
                  className="text-red-600"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Description snippet in the middle */}
        <div className="flex-grow mb-3 overflow-hidden">
          <p className="text-xs text-gray-600 leading-relaxed">
            {getDescriptionSnippet(prompt.description)}
          </p>
        </div>

        {/* Bottom section with tags */}
        <div className="flex-shrink-0">
          {/* Tags at the bottom with more space */}
          <div className="flex flex-wrap gap-1 relative">
            {prompt.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="inline-block px-2 py-1 text-xs bg-white/60 rounded-full text-gray-700 font-medium"
                title={tag.description || tag.name}
              >
                {tag.name}
              </span>
            ))}
            {prompt.tags.length > 2 && (
              <DropdownMenu open={showAllTags} onOpenChange={setShowAllTags}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="inline-block px-2 py-1 text-xs bg-white/40 rounded-full text-gray-600 hover:bg-white/60 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    +{prompt.tags.length - 2}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="bg-white border shadow-lg z-50 max-w-xs"
                  style={{ zIndex: 9999 }}
                >
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-700 mb-2">All Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {prompt.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-block px-2 py-1 text-xs bg-gray-100 rounded-full text-gray-700 font-medium"
                          title={tag.description || tag.name}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Like count display at bottom */}
          {localLikeCount > 0 && (
            <div className="mt-2 text-xs text-gray-700 font-medium">
              {localLikeCount} {localLikeCount === 1 ? 'like' : 'likes'}
            </div>
          )}
        </div>
      </article>
      </Link>
    </div>
  );
};

interface PromptListProps {
  folderId?: string;
  prompts?: PromptWithTags[];
  searchQuery?: string;
  selectedTagIds?: string[];
}

export const PromptList = ({
  folderId,
  prompts: initialPrompts,
  searchQuery = "",
  selectedTagIds = []
}: PromptListProps) => {
  const [prompts, setPrompts] = useState<PromptWithTags[]>(initialPrompts || []);
  const [isLoading, setIsLoading] = useState(!initialPrompts);
  const removePromptFromState = (promptId: string) => {
    setPrompts((prevPrompts) => prevPrompts.filter((p) => p.id !== promptId));
  };
  const [wasCreatePromptOpen, setWasCreatePromptOpen] = useState(false);
  const { isOpen, type } = useModal();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        return selectedTagIds.some((tagId) =>
          prompt.tags.some((tag) => tag.id === tagId)
        );
      });
    }

    return filtered;
  }, [prompts, searchQuery, selectedTagIds]);

  const fetchPrompts = useCallback(async () => {
    setIsLoading(true);
    try {
      if (folderId !== undefined) {
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
  }, [folderId, initialPrompts]);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setPrompts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        newItems.forEach((item, index) => {
          movePrompt(item.id, item.folderId, index);
        });

        return newItems;
      });
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-12 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonPromptCard key={i} />
        ))}
      </div>
    );
  }

  // Show message when no prompts match the filters
  if (filteredPrompts.length === 0 && prompts.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icons.Search className="h-12 w-12 text-gray-600 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No prompts found</h3>
        <p className="text-gray-700 max-w-md">
          {searchQuery && selectedTagIds.length > 0
            ? `No prompts match your search "${searchQuery}" and selected tags.`
            : searchQuery
            ? `No prompts match your search "${searchQuery}".`
            : selectedTagIds.length > 0
            ? "No prompts match your selected tags."
            : "No prompts found."}
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={filteredPrompts} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-12 p-4">
          {filteredPrompts.map((prompt) => (
            <PromptItem key={prompt.id} prompt={prompt} onConfirm={() => removePromptFromState(prompt.id)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};