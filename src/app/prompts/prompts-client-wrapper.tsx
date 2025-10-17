'use client';

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import { toast } from "sonner";
import { getFolders } from "@/app/actions/folder.actions.cached";
import {
  movePromptWithCache,
  deletePromptWithCache,
} from "@/app/actions/prompt.actions.cached";
import type { PromptGridItem } from "@/components/prompts/prompt-grid";

interface PromptsClientWrapperProps {
  initialPrompts: PromptGridItem[];
  folders: Array<{ id: string; name: string; children?: unknown[] }>;
  tags: Array<{ id: string; name: string }>;
  initialViewMode: 'folders' | 'tags';
  initialFolderId: string | null;
  initialTagId: string | null;
  initialSearchQuery: string;
  initialSelectedTagIds: string[];
}

interface SelectedFolder {
  id: string | null;
  name: string;
}

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

export function PromptsClientWrapper({
  initialPrompts,
  folders,
  tags,
  initialViewMode,
  initialFolderId,
  initialTagId,
  initialSearchQuery,
  initialSelectedTagIds
}: PromptsClientWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [viewMode, setViewMode] = useState<'folders' | 'tags'>(initialViewMode);
  const [selectedFolder, setSelectedFolder] = useState<SelectedFolder>({
    id: initialFolderId,
    name: initialFolderId ? folders.find(f => f.id === initialFolderId)?.name || 'Default' : 'Default',
  });
  const [selectedTag, setSelectedTag] = useState<SelectedTag>({
    id: initialTagId,
    name: initialTagId ? tags.find(t => t.id === initialTagId)?.name || 'All Prompts' : 'All Prompts',
  });
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialSelectedTagIds);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  const [moveOptions, setMoveOptions] = useState<MoveFolderOption[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Update URL when filters change
  const updateURL = useCallback((updates: Record<string, string | string[] | null>) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        params.delete(key);
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','));
        } else {
          params.delete(key);
        }
      } else {
        params.set(key, value);
      }
    });

    const queryString = params.toString();
    const newURL = queryString ? `${pathname}?${queryString}` : pathname;

    startTransition(() => {
      router.push(newURL);
    });
  }, [pathname, searchParams, router]);

  const handleViewModeChange = useCallback((mode: 'folders' | 'tags') => {
    setViewMode(mode);
    localStorage.setItem("promptsViewMode", mode);
    updateURL({ view: mode });
  }, [updateURL]);

  const handleFolderSelect = useCallback((folderId: string, folderName: string) => {
    const newFolder = {
      id: folderId || null,
      name: folderName || "Default",
    };
    setSelectedFolder(newFolder);
    localStorage.setItem("selectedFolder", JSON.stringify(newFolder));
    updateURL({ folderId: folderId || null, tagId: null });
  }, [updateURL]);

  const handleTagSelect = useCallback((tagId: string | null, tagName: string) => {
    const newTag = {
      id: tagId,
      name: tagName,
    };
    setSelectedTag(newTag);
    localStorage.setItem("selectedTag", JSON.stringify(newTag));
    updateURL({ tagId: tagId, folderId: null });
  }, [updateURL]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    updateURL({ search: query || null });
  }, [updateURL]);

  const handleTagsChange = useCallback((tagIds: string[]) => {
    setSelectedTagIds(tagIds);
    updateURL({ tags: tagIds });
  }, [updateURL]);

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
      toast.error("Couldn't load folders");
    } finally {
      setIsLoadingFolders(false);
    }
  }, []);

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
        toast.success(`Moved to ${label}.`);
        setSelectedPromptIds([]);
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        console.error("Failed to move prompts:", error);
        toast.error(error instanceof Error ? error.message : "Couldn't move prompts");
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedPromptIds]
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
      toast.success(`${selectedPromptIds.length} prompt${selectedPromptIds.length > 1 ? "s" : ""} removed.`);
      setSelectedPromptIds([]);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to delete prompts:", error);
      toast.error(error instanceof Error ? error.message : "Couldn't delete prompts");
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPromptIds]);

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
                <Tabs value={viewMode} onValueChange={(value) => handleViewModeChange(value as 'folders' | 'tags')}>
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
              onSearchChange={handleSearchChange}
              onTagsChange={handleTagsChange}
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
            prompts={initialPrompts}
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