"use client";

import { useState, useEffect, useMemo } from "react";
import { getTagsWithPrompts } from "@/app/actions/tag-management.actions";
import { getAllPrompts, togglePromptLike } from "@/app/actions/prompt.actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { stickyNoteCard } from "@/lib/styles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useModal } from "@/hooks/use-modal-store";

interface TaggedPrompt {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  likeCount?: number;
  isLikedByUser?: boolean;
  tags?: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
}

interface TaggedPromptsListProps {
  selectedTagId: string | null;
  selectedTagName: string;
}

// TaggedPromptItem component that exactly matches the main PromptItem
const TaggedPromptItem = ({ prompt }: { prompt: TaggedPrompt }) => {
  const { onOpen } = useModal();
  const [isLiking, setIsLiking] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(prompt.likeCount || 0);
  const [localIsLiked, setLocalIsLiked] = useState(prompt.isLikedByUser || false);
  const [showAllTags, setShowAllTags] = useState(false);
  
  // Generate consistent color based on prompt ID
  const colors: Array<'yellow' | 'blue' | 'green' | 'pink' | 'orange'> = ['yellow', 'blue', 'green', 'pink', 'orange'];
  const colorIndex = prompt.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % colors.length;
  const stickyColor = colors[colorIndex];

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
        console.log("Link copied to clipboard!");
      }
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  const tags = prompt.tags || [];

  return (
    <div className="mb-6">
      <Link href={`/prompts/${prompt.id}`} className="block">
        <div className={stickyNoteCard(stickyColor, "group relative cursor-pointer flex flex-col p-6")}>
          {/* Sticky note header with title, like/share buttons, and menu */}
          <div className="flex justify-between items-start mb-4 flex-shrink-0">
            <div className="flex-grow text-xl font-semibold text-gray-800 hover:text-dell-blue-600 transition-colors line-clamp-4 mr-2">
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
            >
              <Icons.Heart className={`h-3 w-3 ${localIsLiked ? 'fill-current' : ''}`} />
            </button>

            {/* Share button */}
            <button
              onClick={handleShare}
              className="w-6 h-6 rounded-full bg-white/80 text-gray-600 hover:bg-white hover:shadow-md flex items-center justify-center transition-all duration-200 hover:scale-110"
              title="Share this prompt"
            >
              <Icons.Share2 className="h-3 w-3" />
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
                >
                  <Icons.MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpen("renamePrompt", {
                      prompt: {
                        ...prompt,
                        userId: '',
                        order: null,
                        content: '',
                        folderId: null,
                        lastUsedAt: null
                      }
                    });
                  }}
                >
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpen("movePrompt", {
                      prompt: {
                        ...prompt,
                        userId: '',
                        order: null,
                        content: '',
                        folderId: null,
                        lastUsedAt: null
                      }
                    });
                  }}
                >
                  Move to Folder
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onOpen("deletePrompt", {
                      prompt: {
                        ...prompt,
                        userId: '',
                        order: null,
                        content: '',
                        folderId: null,
                        lastUsedAt: null
                      }
                    });
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
        <div className="flex-grow mb-4 overflow-hidden">
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-8">
            {getDescriptionSnippet(prompt.description)}
          </p>
        </div>

        {/* Bottom section with tags */}
        <div className="flex-shrink-0">
          {/* Tags at the bottom with more space */}
          <div className="flex flex-wrap gap-1 relative">
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="inline-block px-2 py-1 text-xs bg-white/60 rounded-full text-gray-700 font-medium"
                title={tag.description || tag.name}
              >
                {tag.name}
              </span>
            ))}
            {tags.length > 2 && (
              <DropdownMenu open={showAllTags} onOpenChange={setShowAllTags}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="inline-block px-2 py-1 text-xs bg-white/40 rounded-full text-gray-600 hover:bg-white/60 transition-colors cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    +{tags.length - 2}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="bg-white border shadow-lg z-50 max-w-xs"
                  style={{ zIndex: 9999 }}
                >
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 mb-2">All Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
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
            <div className="mt-2 text-xs text-gray-500 font-medium">
              {localLikeCount} {localLikeCount === 1 ? 'like' : 'likes'}
            </div>
          )}
        </div>
      </div>
      </Link>
    </div>
  );
};

export const TaggedPromptsList = ({ selectedTagId, selectedTagName }: TaggedPromptsListProps) => {
  const [prompts, setPrompts] = useState<TaggedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchPrompts = async () => {
      setLoading(true);
      try {
        if (selectedTagId === null) {
          // Show all prompts
          const allPrompts = await getAllPrompts();
          setPrompts(allPrompts);
        } else {
          // Show prompts for specific tag
          const tagsWithPrompts = await getTagsWithPrompts();
          const selectedTag = tagsWithPrompts.find(tag => tag.id === selectedTagId);
          setPrompts(selectedTag?.prompts || []);
        }
      } catch (error) {
        console.error("Error fetching prompts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrompts();
  }, [selectedTagId]);

  // Filter prompts based on search query
  const filteredPrompts = useMemo(() => {
    if (!searchQuery.trim()) {
      return prompts;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return prompts.filter((prompt) => {
      const titleMatch = prompt.title.toLowerCase().includes(query);
      const descriptionMatch = prompt.description?.toLowerCase().includes(query) || false;
      return titleMatch || descriptionMatch;
    });
  }, [prompts, searchQuery]);

  if (loading) {
    return (
      <div className="pb-4 px-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-12">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-yellow-100 rounded-lg p-4 w-96 h-96 shadow-md">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4 px-4">
      <div className="flex justify-between items-center mb-4 pt-4">
        <span className="font-medium">
          Selected tag: <span className="text-blue-500">{selectedTagName}</span>
        </span>
      </div>
      
      {/* Search Component */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {filteredPrompts.length === 0 ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <Icons.File className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No prompts found</h3>
            <p className="text-muted-foreground">
              {searchQuery.trim() ? (
                `No prompts match your search "${searchQuery}".`
              ) : selectedTagId === null ? (
                "You haven't created any prompts yet."
              ) : (
                `No prompts are tagged with "${selectedTagName}".`
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-12">
          {filteredPrompts.map((prompt) => (
            <TaggedPromptItem key={prompt.id} prompt={prompt} />
          ))}
        </div>
      )}
    </div>
  );
};