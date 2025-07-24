"use client";

import { FolderSidebar } from "@/components/folders/folder-sidebar";
import { TagSidebar } from "@/components/tags/tag-sidebar";
import { PromptList } from "@/components/prompts/prompt-list";
import { PromptFilters } from "@/components/prompts/prompt-filters";
import { ResizablePanels } from "@/components/ui/resizable-panels";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Folder, Tag } from "lucide-react";

interface SelectedFolder {
  id: string | null;
  name: string;
}

type ViewMode = "folders" | "tags";

interface SelectedTag {
  id: string | null;
  name: string;
}

export default function Prompts() {
  const [viewMode, setViewMode] = useState<ViewMode>("folders");
  const [selectedFolder, setSelectedFolder] = useState<SelectedFolder>({
    id: null,
    name: "Default"
  });
  const [selectedTag, setSelectedTag] = useState<SelectedTag>({
    id: null,
    name: "All Prompts"
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  // Load view mode and selections from localStorage on mount
  useEffect(() => {
    const savedViewMode = localStorage.getItem('promptsViewMode');
    if (savedViewMode === 'folders' || savedViewMode === 'tags') {
      setViewMode(savedViewMode);
    }

    const savedFolder = localStorage.getItem('selectedFolder');
    if (savedFolder) {
      try {
        const parsedFolder = JSON.parse(savedFolder);
        setSelectedFolder(parsedFolder);
      } catch (error) {
        console.error('Error parsing saved folder:', error);
      }
    }

    const savedTag = localStorage.getItem('selectedTag');
    if (savedTag) {
      try {
        const parsedTag = JSON.parse(savedTag);
        setSelectedTag(parsedTag);
      } catch (error) {
        console.error('Error parsing saved tag:', error);
      }
    }
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('promptsViewMode', mode);
  }, []);

  const handleFolderSelect = useCallback((folderId: string, folderName: string) => {
    const newFolder = {
      id: folderId || null,
      name: folderName || "Default"
    };
    setSelectedFolder(newFolder);
    
    // Save selected folder to localStorage
    localStorage.setItem('selectedFolder', JSON.stringify(newFolder));
  }, []);

  const handleTagSelect = useCallback((tagId: string | null, tagName: string) => {
    const newTag = {
      id: tagId,
      name: tagName
    };
    setSelectedTag(newTag);
    
    // Save selected tag to localStorage
    localStorage.setItem('selectedTag', JSON.stringify(newTag));
  }, []);

  const handleImportComplete = useCallback(() => {
    // Force refresh of the prompt list
    setRefreshKey(prev => prev + 1);
  }, []);

  // Determine which sidebar to show based on view mode
  const sidebar = viewMode === "folders" ? (
    <FolderSidebar onSelectFolder={handleFolderSelect} selectedFolder={selectedFolder} />
  ) : (
    <TagSidebar onSelectTag={handleTagSelect} selectedTag={selectedTag} />
  );

  // Determine which prompts to show based on view mode
  const promptListProps = viewMode === "folders" ? {
    folderId: selectedFolder.id || undefined,
    searchQuery,
    selectedTagIds,
  } : {
    tagId: selectedTag.id || undefined,
    searchQuery,
    selectedTagIds: selectedTag.id ? [selectedTag.id] : [],
  };

  return (
    <ResizablePanels
      leftPanel={sidebar}
      rightPanel={
        <div className="pb-4 px-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pt-4">
            <h1 className="sr-only">Prompts Management</h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">View by:</span>
                <Tabs value={viewMode} onValueChange={(v) => handleViewModeChange(v as ViewMode)}>
                  <TabsList>
                    <TabsTrigger value="folders" className="flex items-center gap-1 sm:gap-2">
                      <Folder className="h-4 w-4" />
                      <span className="hidden sm:inline">Folders</span>
                    </TabsTrigger>
                    <TabsTrigger value="tags" className="flex items-center gap-1 sm:gap-2">
                      <Tag className="h-4 w-4" />
                      <span className="hidden sm:inline">Tags</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <span className="font-medium text-sm sm:text-base">
                {viewMode === "folders" ? (
                  <>Selected: <span className="text-[hsl(var(--accent))]">{selectedFolder.name}</span></>
                ) : (
                  <>Selected: <span className="text-[hsl(var(--accent))]">{selectedTag.name}</span></>
                )}
              </span>
            </div>
          </div>
          
          {/* Filter Component with integrated New Prompt button */}
          <div className="mb-6">
            <PromptFilters
              onSearchChange={setSearchQuery}
              onTagsChange={setSelectedTagIds}
              searchValue={searchQuery}
              selectedTagIds={selectedTagIds}
              onNewPrompt={() => {
                if (viewMode === "folders") {
                  router.push(`/prompts/new?folderId=${selectedFolder.id || ''}`);
                } else {
                  // When in tag view, create new prompt with the selected tag pre-filled
                  const url = selectedTag.id 
                    ? `/prompts/new?tags=${encodeURIComponent(selectedTag.name)}`
                    : '/prompts/new';
                  router.push(url);
                }
              }}
              folderId={selectedFolder.id || undefined}
              onImportComplete={handleImportComplete}
            />
          </div>
          
          <PromptList
            key={`${viewMode}-${refreshKey}`}
            {...promptListProps}
          />
        </div>
      }
      defaultLeftWidth={210}
      minLeftWidth={150}
      maxLeftWidth={500}
    />
  );
}