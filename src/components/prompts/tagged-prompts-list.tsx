"use client";

import { useState, useEffect, useMemo } from "react";
import { getTagsWithPrompts } from "@/app/actions/tag-management.actions";
import { getAllPrompts } from "@/app/actions/prompt.actions";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { PromptGrid } from "./prompt-grid";
import { PromptList } from "./prompt-list";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";

interface TaggedPrompt {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  order: number | null;
  content: string | null;
  folderId: string | null;
  lastUsedAt: Date | null;
  enhancedContent: string | null;
  enhancementSuggestions: unknown;
  autoTags: string[] | null;
  embedding: number[] | null;
  templateId: string | null;
  likeCount?: number;
  isLikedByUser?: boolean;
  favoriteCount?: number;
  isFavoritedByUser?: boolean;
  tags: Array<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
  }>;
}

interface TaggedPromptsListProps {
  selectedTagId: string | null;
  selectedTagName: string;
}


export const TaggedPromptsList = ({ selectedTagId, selectedTagName }: TaggedPromptsListProps) => {
  const [prompts, setPrompts] = useState<TaggedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted rounded-lg p-6 h-48">
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
      
      {/* Search Component and View Toggle */}
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
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              onClick={() => setViewMode("grid")}
              className="h-8 px-3"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              className="h-8 px-3"
            >
              <List className="h-4 w-4" />
            </Button>
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
        viewMode === "grid" ? (
          <PromptGrid prompts={filteredPrompts} showFavoriteButton={true} />
        ) : (
          <PromptList prompts={filteredPrompts} />
        )
      )}
    </div>
  );
};