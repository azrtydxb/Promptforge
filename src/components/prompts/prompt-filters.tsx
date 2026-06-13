"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/ui/icons";
import { getAllTagsRedis as getAllTags } from "@/app/actions/tag.actions.redis";
import { Download, Upload } from "lucide-react";
import { exportPrompts, importPrompts } from "@/app/actions/prompt-export-import.actions";
import { useRef } from "react";
import { toast } from "sonner";

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
  folderId?: string;
  onImportComplete?: () => void;
}

export function PromptFilters({
  onSearchChange,
  onTagsChange,
  searchValue,
  selectedTagIds,
  onNewPrompt,
  folderId,
  onImportComplete,
}: PromptFiltersProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagSearchValue, setTagSearchValue] = useState("");
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = await exportPrompts();
      
      // Create a blob and download it
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prompts-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${exportData.prompts.length} prompts`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);


      const result = await importPrompts(data, folderId);

      toast.success(`Imported ${result.imported} prompts, skipped ${result.skipped} duplicates`);
      
      if (result.errors.length > 0) {
        console.error("Import errors:", result.errors);
      }
      
      // Refresh the prompt list
      onImportComplete?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3 rounded-[11px] border border-line-200 bg-surface-card p-3">
      {/* Main horizontal bar with search inputs and buttons */}
      <div className="flex items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Icons.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search prompts..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tag Search Input */}
        <div className="relative flex-1">
          <Icons.Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
              {filteredTags.length === 0 ? (
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  No tags found
                </div>
              ) : (
                filteredTags.map((tag) => (
                  <div
                    key={tag.id}
                    onClick={() => handleTagSelect(tag.id)}
                    className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded border ${
                          selectedTagIds.includes(tag.id)
                            ? "bg-primary border-primary"
                            : "border-input"
                        }`}
                      >
                        {selectedTagIds.includes(tag.id) && (
                          <Icons.Check className="w-2 h-2 text-primary-foreground m-0.5" />
                        )}
                      </div>
                      <span className="text-sm">{tag.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
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
              className="whitespace-nowrap"
            >
              <Icons.FilterX className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="whitespace-nowrap"
            title="Export all prompts"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="whitespace-nowrap"
            title="Import prompts from file"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isImporting ? "Importing..." : "Import"}
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          
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
              className="flex items-center gap-1"
            >
              {tag.name}
              <button
                onClick={() => handleTagRemove(tag.id)}
                className="ml-1 hover:bg-accent rounded-full p-0.5 transition-colors"
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