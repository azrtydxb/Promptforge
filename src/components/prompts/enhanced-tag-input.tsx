"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { X, ChevronDown, Plus } from "lucide-react";
import { getAllTagsRedis as getAllTags } from "@/app/actions/tag.actions.redis";
import { cn } from "@/lib/utils";

interface Tag {
  id: string;
  name: string;
  description: string | null;
}

interface EnhancedTagInputProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const EnhancedTagInput = ({ 
  selectedTags, 
  onTagsChange, 
  placeholder = "Add tags...",
  className 
}: EnhancedTagInputProps) => {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load available tags on component mount
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await getAllTags();
        setAvailableTags(tags);
        setFilteredTags(tags);
      } catch (error) {
        console.error("Error loading tags:", error);
      }
    };
    loadTags();
  }, []);

  // Filter tags based on input value
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredTags(availableTags.filter(tag => !selectedTags.includes(tag.name)));
    } else {
      const filtered = availableTags.filter(tag => 
        tag.name.toLowerCase().includes(inputValue.toLowerCase()) && 
        !selectedTags.includes(tag.name)
      );
      setFilteredTags(filtered);
    }
    setHighlightedIndex(-1);
  }, [inputValue, availableTags, selectedTags]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsDropdownOpen(true);
  };

  const handleInputFocus = () => {
    setIsDropdownOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredTags.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredTags.length) {
        selectTag(filteredTags[highlightedIndex].name);
      } else if (inputValue.trim()) {
        // Create new tag if it doesn't exist
        const trimmedValue = inputValue.trim();
        if (!selectedTags.includes(trimmedValue)) {
          onTagsChange([...selectedTags, trimmedValue]);
          setInputValue("");
          setIsDropdownOpen(false);
        }
      }
    } else if (e.key === "Escape") {
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const selectTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      onTagsChange([...selectedTags, tagName]);
    }
    setInputValue("");
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const createNewTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !selectedTags.includes(trimmedValue)) {
      onTagsChange([...selectedTags, trimmedValue]);
      setInputValue("");
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input with dropdown */}
      <div className="relative">
        <div className="flex">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-2 px-3"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              isDropdownOpen && "rotate-180"
            )} />
          </Button>
        </div>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-md max-h-60 overflow-auto"
          >
            {filteredTags.length > 0 || (inputValue.trim() && !availableTags.some(tag => tag.name.toLowerCase() === inputValue.toLowerCase())) ? (
              <>
                {inputValue.trim() && !availableTags.some(tag => tag.name.toLowerCase() === inputValue.toLowerCase()) && (
                  <div
                    onClick={createNewTag}
                    className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2 border-b"
                  >
                    <Plus className="h-4 w-4" />
                    Create &quot;{inputValue.trim()}&quot;
                  </div>
                )}
                {filteredTags.map((tag, index) => (
                  <div
                    key={tag.id}
                    onClick={() => selectTag(tag.name)}
                    className={cn(
                      "px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground",
                      index === highlightedIndex && "bg-accent text-accent-foreground"
                    )}
                  >
                    <div className="font-medium">{tag.name}</div>
                    {tag.description && (
                      <div className="text-xs text-muted-foreground">{tag.description}</div>
                    )}
                  </div>
                ))}
              </>
            ) : inputValue.trim() ? (
              <div
                onClick={createNewTag}
                className="px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create &quot;{inputValue.trim()}&quot;
              </div>
            ) : (
              <div className="px-3 py-2 text-muted-foreground text-sm">
                No matching tags found. Start typing to create a new tag.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};