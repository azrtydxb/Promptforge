"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FolderSidebar } from "@/components/folders/folder-sidebar";
import { TagSidebar } from "@/components/tags/tag-sidebar";
import { PromptList } from "@/components/prompts/prompt-list";
import { PromptFilters } from "@/components/prompts/prompt-filters";
import { ResizablePanels } from "@/components/ui/resizable-panels";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Folder, Tag, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { getFolders } from "@/app/actions/folder.actions.cached";
import {
  movePromptWithCache,
  deletePromptWithCache,
} from "@/app/actions/prompt.actions.cached";
import type { PromptGridItem } from "@/components/prompts/prompt-grid";

interface SelectedFolder {
  id: string | null;
  name: string;
}

type ViewMode = "folders" | "tags";

interface SelectedTag {
  id: string | null;
  name: string;
}

type FolderTreeNode = {
  id: string;
  name: string;
  children?: FolderTreeNode[];
};

interface MoveFolderOption {
  id: string | null;
  label: string;
}

function flattenFolderTree(
  nodes: FolderTreeNode[],
  depth = 0
): MoveFolderOption[] {
  const indent = depth > 0 ? `${"  ".repeat(depth)}- ` : "";
  return nodes.flatMap((node) => [
    { id: node.id, label: `${indent}${node.name}` },
    ...flattenFolderTree(node.children ?? [], depth + 1),
  ]);
}

export default function Prompts() {
  const [viewMode, setViewMode] = useState<ViewMode>("folders");
  const [selectedFolder, setSelectedFolder] = useState<SelectedFolder>({
    id: null,
    name: "Default",
  });
  const [selectedTag, setSelectedTag] = useState<SelectedTag>({
    id: null,
    name: "All Prompts",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  const [moveOptions, setMoveOptions] = useState<MoveFolderOption[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Persisted preferences
  useEffect(() => {
    const savedViewMode = localStorage.getItem("promptsViewMode");
    if (savedViewMode === "folders" || savedViewMode === "tags") {
      setViewMode(savedViewMode);
    }

    const savedFolder = localStorage.getItem("selectedFolder");
    if (savedFolder) {
      try {
        const parsed = JSON.parse(savedFolder);
        setSelectedFolder(parsed);
      } catch (error) {
        console.error("Error parsing saved folder:", error);
      }
    }

    const savedTag = localStorage.getItem("selectedTag");
    if (savedTag) {
      try {
        const parsedTag = JSON.parse(savedTag);
        setSelectedTag(parsedTag);
      } catch (error) {
        console.error("Error parsing saved tag:", error);
      }
    }
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("promptsViewMode", mode);
  }, []);

  const handleFolderSelect = useCallback((folderId: string, folderName: string) => {
    const newFolder = {
      id: folderId || null,
      name: folderName || "Default",
    };
    setSelectedFolder(newFolder);
    localStorage.setItem("selectedFolder", JSON.stringify(newFolder));
  }, []);

  const handleTagSelect = useCallback((tagId: string | null, tagName: string) => {
    const newTag = {
      id: tagId,
      name: tagName,
    };
    setSelectedTag(newTag);
    localStorage.setItem("selectedTag", JSON.stringify(newTag));
  }, []);

  const handleImportComplete = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  // Reset selection when view or folder context changes
  useEffect(() => {
    setSelectedPromptIds([]);
  }, [viewMode, selectedFolder.id]);

  const handleTogglePromptSelection = useCallback((promptId: string) => {
    setSelectedPromptIds((prev) =>
      prev.includes(promptId)
        ? prev.filter((id) => id !== promptId)
        : [...prev, promptId]
    );
  }, []);

  const handlePromptsLoaded = useCallback((prompts: PromptGridItem[]) => {
    if (!selectedPromptIds.length) return;
    const promptSet = new Set(prompts.map((prompt) => prompt.id));
    setSelectedPromptIds((prev) => prev.filter((id) => promptSet.has(id)));
  }, [selectedPromptIds.length]);

  const loadMoveFolders = useCallback(async () => {
    try {
      setIsLoadingFolders(true);
      const folders = await getFolders();
      const flat = [
        { id: null, label: "No folder (root)" },
        ...flattenFolderTree(folders as FolderTreeNode[]),
      ];
      setMoveOptions(flat);
    } catch (error) {
      console.error("Failed to load folders:", error);
      toast({
        variant: "destructive",
        title: "Couldn't load folders",
        description: "Please try again shortly.",
      });
    } finally {
      setIsLoadingFolders(false);
    }
  }, [toast]);

  const handleMoveSelected = useCallback(
    async (targetFolderId: string | null, label: string) => {
      if (!selectedPromptIds.length) return;
      setIsProcessing(true);
      try {
        await Promise.all(
          selectedPromptIds.map((promptId, index) =>
            movePromptWithCache(promptId, targetFolderId, index)
          )
        );
        toast({
          title: "Prompts moved",
          description: `Moved to ${label}.`,
        });
        setSelectedPromptIds([]);
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        console.error("Failed to move prompts:", error);
        toast({
          variant: "destructive",
          title: "Couldn't move prompts",
          description: error instanceof Error ? error.message : "Please try again.",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedPromptIds, toast]
  );

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedPromptIds.length) return;
    const confirmed = window.confirm(
      selectedPromptIds.length === 1
        ? "Delete the selected prompt?"
        : `Delete the ${selectedPromptIds.length} selected prompts?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await Promise.all(selectedPromptIds.map((id) => deletePromptWithCache(id)));
      toast({
        title: "Prompts deleted",
        description: `${selectedPromptIds.length} prompt${selectedPromptIds.length > 1 ? "s" : ""} removed.`,
      });
      setSelectedPromptIds([]);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to delete prompts:", error);
      toast({
        variant: "destructive",
        title: "Couldn't delete prompts",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPromptIds, toast]);

  const sidebar = viewMode === "folders" ? (
    <FolderSidebar onSelectFolder={handleFolderSelect} selectedFolder={selectedFolder} />
  ) : (
    <TagSidebar onSelectTag={handleTagSelect} selectedTag={selectedTag} />
  );

  const promptListProps = viewMode === "folders"
    ? {
        folderId: selectedFolder.id || undefined,
        searchQuery,
        selectedTagIds,
      }
    : {
        tagId: selectedTag.id || undefined,
        searchQuery,
        selectedTagIds: selectedTag.id ? [selectedTag.id] : [],
      };

  const hasSelection = selectedPromptIds.length > 0;

  return (
    <ResizablePanels
      leftPanel={sidebar}
      rightPanel={
        <div className="pb-4 px-4 overflow-x-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 pt-4">
            <h1 className="sr-only">Prompts Management</h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 max-w-full">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground whitespace-nowrap">View by:</span>
                <Tabs value={viewMode} onValueChange={(value) => handleViewModeChange(value as ViewMode)}>
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
              <span className="font-medium text-sm sm:text-base truncate max-w-full">
                {viewMode === "folders" ? (
                  <>Selected: <span className="text-[#546ee5] font-semibold">{selectedFolder.name}</span></>
                ) : (
                  <>Selected: <span className="text-[#546ee5] font-semibold">{selectedTag.name}</span></>
                )}
              </span>
            </div>

            {viewMode === "folders" && (
              <div className="flex items-center gap-2">
                {hasSelection && (
                  <span className="text-sm text-muted-foreground">
                    {selectedPromptIds.length} selected
                  </span>
                )}
                <DropdownMenu
                  onOpenChange={(open) => {
                    if (open) {
                      void loadMoveFolders();
                    }
                  }}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!hasSelection || isProcessing}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Move
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="max-h-64 overflow-y-auto border border-border shadow-lg bg-[hsl(var(--popover))] text-popover-foreground"
                  >
                    {isLoadingFolders ? (
                      <DropdownMenuItem disabled>Loading folders...</DropdownMenuItem>
                    ) : (
                      moveOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.id ?? "root"}
                          onClick={() => handleMoveSelected(option.id, option.label)}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="destructive"
                  onClick={handleDeleteSelected}
                  disabled={!hasSelection || isProcessing}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          <div className="mb-6">
            <PromptFilters
              onSearchChange={setSearchQuery}
              onTagsChange={setSelectedTagIds}
              searchValue={searchQuery}
              selectedTagIds={selectedTagIds}
              onNewPrompt={() => {
                if (viewMode === "folders") {
                  router.push(`/prompts/new?folderId=${selectedFolder.id || ""}`);
                } else {
                  const url = selectedTag.id
                    ? `/prompts/new?tags=${encodeURIComponent(selectedTag.name)}`
                    : "/prompts/new";
                  router.push(url);
                }
              }}
              folderId={selectedFolder.id || undefined}
              onImportComplete={handleImportComplete}
            />
          </div>

          <PromptList
            key={`${viewMode}-${selectedFolder.id ?? "root"}-${refreshKey}`}
            selectedPromptIds={selectedPromptIds}
            onToggleSelect={handleTogglePromptSelection}
            onPromptsLoaded={handlePromptsLoaded}
            {...promptListProps}
          />
        </div>
      }
      defaultLeftWidth={280}
      minLeftWidth={200}
      maxLeftWidth={500}
    />
  );
}
