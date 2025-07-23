"use client";

import { FolderSidebar } from "@/components/folders/folder-sidebar";
import { PromptList } from "@/components/prompts/prompt-list";
import { PromptFilters } from "@/components/prompts/prompt-filters";
import { ResizablePanels } from "@/components/ui/resizable-panels";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface SelectedFolder {
  id: string | null;
  name: string;
}

export default function Prompts() {
  const [selectedFolder, setSelectedFolder] = useState<SelectedFolder>({
    id: null,
    name: "Default"
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  // Load selected folder from localStorage on mount
  useEffect(() => {
    const savedFolder = localStorage.getItem('selectedFolder');
    if (savedFolder) {
      try {
        const parsedFolder = JSON.parse(savedFolder);
        setSelectedFolder(parsedFolder);
      } catch (error) {
        console.error('Error parsing saved folder:', error);
      }
    }
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

  const handleImportComplete = useCallback(() => {
    // Force refresh of the prompt list
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <ResizablePanels
      leftPanel={<FolderSidebar onSelectFolder={handleFolderSelect} selectedFolder={selectedFolder} />}
      rightPanel={
        <div className="pb-4 px-4">
          <div className="flex justify-between items-center mb-4 pt-4">
            <h1 className="sr-only">Prompts Management</h1>
            <span className="font-medium">
              Selected folder: <span className="text-blue-500">{selectedFolder.name}</span>
            </span>
          </div>
          
          {/* Filter Component with integrated New Prompt button */}
          <div className="mb-6">
            <PromptFilters
              onSearchChange={setSearchQuery}
              onTagsChange={setSelectedTagIds}
              searchValue={searchQuery}
              selectedTagIds={selectedTagIds}
              onNewPrompt={() => router.push(`/prompts/new?folderId=${selectedFolder.id || ''}`)}
              folderId={selectedFolder.id || undefined}
              onImportComplete={handleImportComplete}
            />
          </div>
          
          <PromptList
            key={refreshKey}
            folderId={selectedFolder.id || undefined}
            searchQuery={searchQuery}
            selectedTagIds={selectedTagIds}
          />
        </div>
      }
      defaultLeftWidth={210}
      minLeftWidth={150}
      maxLeftWidth={500}
    />
  );
}