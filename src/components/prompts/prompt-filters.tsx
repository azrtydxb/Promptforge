"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/ui/icons";
import { getAllTags } from "@/app/actions/tag-management.actions";

interface Tag {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  _count: {
    prompts: number;
  };
}

interface PromptFiltersProps {
  onSearchChange: (search: string) => void;
  onTagsChange: (tagIds: string[]) => void;
  searchValue: string;
  selectedTagIds: string[];
  onNewPrompt: () => void;
}

export function PromptFilters({
  onSearchChange,
  onTagsChange,
  searchValue,
  selectedTagIds,
  onNewPrompt,
}: PromptFiltersProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagSearchValue, setTagSearchValue] = useState("");
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const fetchedTags = await getAllTags();
        setTags(fetchedTags);
      } catch (error) {
        console.error("Failed to fetch tags:", error);
      }
    };

    fetchTags();
  }, []);

  const filteredTags = useMemo(() => {
    if (!tagSearchValue) return tags;
    return tags.filter((tag) =>
      tag.name.toLowerCase().includes(tagSearchValue.toLowerCase())
    );
  }, [tags, tagSearchValue]);

  const selectedTags = useMemo(() => {
    return tags.filter((tag) => selectedTagIds.includes(tag.id));
  }, [tags, selectedTagIds]);

  const handleTagSelect = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
    // Close dropdown and clear search after selection
    setIsTagDropdownOpen(false);
    setTagSearchValue("");
  };

  const handleTagRemove = (tagId: string) => {
    onTagsChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const clearAllFilters = () => {
    onSearchChange("");
    onTagsChange([]);
    setTagSearchValue("");
    setIsTagDropdownOpen(false);
  };

  const hasActiveFilters = searchValue || selectedTagIds.length > 0;

  return (
    <div className="space-y-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Main horizontal bar with search inputs and buttons */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" aria-hidden="true" />
          <Input
            placeholder="Search prompts..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tag Search Input */}
        <div className="relative flex-1">
          <Icons.Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-600" aria-hidden="true" />
          <Input
            placeholder="Filter by tags..."
            value={tagSearchValue}
            onChange={(e) => {
              setTagSearchValue(e.target.value);
              // Auto-open dropdown only when typing (not on focus)
              if (e.target.value.length > 0) {
                setIsTagDropdownOpen(true);
              } else {
                // Close dropdown when search is cleared
                setIsTagDropdownOpen(false);
              }
            }}
            className="pl-10"
          />
          
          {/* Custom dropdown that doesn't interfere with typing */}
          {isTagDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
              {filteredTags.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-700">
                  No tags found
                </div>
              ) : (
                filteredTags.map((tag) => (
                  <div
                    key={tag.id}
                    onClick={() => handleTagSelect(tag.id)}
                    className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded border ${
                          selectedTagIds.includes(tag.id)
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedTagIds.includes(tag.id) && (
                          <Icons.Check className="w-2 h-2 text-white m-0.5" />
                        )}
                      </div>
                      <span className="text-sm">{tag.name}</span>
                    </div>
                    <span className="text-xs text-gray-700">
                      {tag._count.prompts}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="text-gray-600 hover:text-gray-900 whitespace-nowrap"
            >
              <Icons.FilterX className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
          
          <Button
            onClick={onNewPrompt}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Icons.Plus className="h-4 w-4" />
            New Prompt
          </Button>
        </div>
      </div>

      {/* Selected Tags Row */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200"
            >
              {tag.name}
              <button
                onClick={() => handleTagRemove(tag.id)}
                className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
              >
                <Icons.X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}