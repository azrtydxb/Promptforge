'use client';

import { useState, useEffect, useCallback, useTransition, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { PromptList } from "@/components/prompts/prompt-list";
import { Search, Plus, Upload, Trash2, FolderInput, ChevronDown } from "lucide-react";
import { TopbarPortal } from "@/components/layout/topbar-portal";
import { TopbarTitle, TopbarNewButton } from "@/components/layout/topbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getFoldersRedis as getFolders } from "@/app/actions/folder.actions.redis";
import {
  movePromptWithCache,
  deletePromptWithCache,
} from "@/app/actions/prompt.actions.cached";
import { importPrompts } from "@/app/actions/prompt-export-import.actions";
import { cn } from "@/lib/utils";
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

type FolderTreeNode = { id: string; name: string; children?: FolderTreeNode[] };
interface MoveFolderOption { id: string | null; label: string; }

function flattenFolderTree(nodes: FolderTreeNode[], depth = 0): MoveFolderOption[] {
  const indent = depth > 0 ? `${"  ".repeat(depth)}- ` : "";
  return nodes.flatMap((node) => [
    { id: node.id, label: `${indent}${node.name}` },
    ...flattenFolderTree(node.children ?? [], depth + 1),
  ]);
}

const SORTS = ["Recently used", "Recently updated", "Most used", "A–Z"];

export function PromptsClientWrapper({
  initialPrompts,
  folders,
  initialFolderId,
  initialSearchQuery,
  initialSelectedTagIds,
}: PromptsClientWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedTagIds] = useState<string[]>(initialSelectedTagIds);
  const [sort, setSort] = useState(SORTS[0]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  const [moveOptions, setMoveOptions] = useState<MoveFolderOption[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialRender = useRef(true);

  useEffect(() => { isInitialRender.current = false; }, []);

  const updateURL = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }, [pathname, searchParams, router]);

  const selectFolder = useCallback((id: string | null) => {
    setSelectedFolderId(id);
    setSelectedPromptIds([]);
    updateURL({ folderId: id, tagId: null });
  }, [updateURL]);

  const onSearch = useCallback((q: string) => {
    setSearchQuery(q);
    updateURL({ search: q || null });
  }, [updateURL]);

  const toggleSelect = useCallback((promptId: string) => {
    setSelectedPromptIds((prev) =>
      prev.includes(promptId) ? prev.filter((id) => id !== promptId) : [...prev, promptId]
    );
  }, []);

  const onPromptsLoaded = useCallback((prompts: PromptGridItem[]) => {
    if (!selectedPromptIds.length) return;
    const set = new Set(prompts.map((p) => p.id));
    setSelectedPromptIds((prev) => prev.filter((id) => set.has(id)));
  }, [selectedPromptIds.length]);

  const loadMoveFolders = useCallback(async () => {
    try {
      const f = await getFolders();
      setMoveOptions([{ id: null, label: "No folder (root)" }, ...flattenFolderTree(f as FolderTreeNode[])]);
    } catch {
      toast.error("Couldn't load folders");
    }
  }, []);

  const moveSelected = useCallback(async (targetFolderId: string | null, label: string) => {
    if (!selectedPromptIds.length) return;
    setIsProcessing(true);
    try {
      await Promise.all(selectedPromptIds.map((id, i) => movePromptWithCache(id, targetFolderId, i)));
      toast.success(`Moved to ${label}.`);
      setSelectedPromptIds([]);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't move prompts");
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPromptIds]);

  const deleteSelected = useCallback(async () => {
    if (!selectedPromptIds.length) return;
    if (!window.confirm(`Delete ${selectedPromptIds.length} prompt(s)?`)) return;
    setIsProcessing(true);
    try {
      await Promise.all(selectedPromptIds.map((id) => deletePromptWithCache(id)));
      toast.success(`${selectedPromptIds.length} removed.`);
      setSelectedPromptIds([]);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete");
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPromptIds]);

  const onImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const result = await importPrompts(data, selectedFolderId || undefined);
      toast.success(`Imported ${result.imported}, skipped ${result.skipped}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [selectedFolderId]);

  const topFolders = folders.slice(0, 5);
  const hasSelection = selectedPromptIds.length > 0;

  return (
    <div className="space-y-4">
      <TopbarPortal>
        <TopbarTitle>My Prompts</TopbarTitle>
        <span className="text-[12.5px] tabular-nums text-ink-400">{initialPrompts.length} total</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-[7px] border border-line-200 bg-surface-card px-3 py-[7px] text-[12.5px] font-[550] text-ink-700 hover:bg-surface-muted"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
          <TopbarNewButton
            label="New prompt"
            onClick={() => router.push(`/prompts/new${selectedFolderId ? `?folderId=${selectedFolderId}` : ""}`)}
          />
        </div>
      </TopbarPortal>
      <input ref={fileInputRef} type="file" accept=".json" onChange={onImport} className="hidden" />

      {/* Toolbar: search + filter pills + sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={`Search ${initialPrompts.length} prompts…`}
            className="h-9 w-full rounded-[7px] border border-line-200 bg-surface-muted pl-9 pr-3 text-[13px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FilterPill active={selectedFolderId === null} onClick={() => selectFolder(null)}>
            All
          </FilterPill>
          {topFolders.map((f) => (
            <FilterPill key={f.id} active={selectedFolderId === f.id} onClick={() => selectFolder(f.id)}>
              {f.name}
            </FilterPill>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="ml-auto flex items-center gap-1.5 rounded-[7px] border border-line-200 bg-surface-card px-3 py-2 text-[12px] font-[500] text-ink-600 hover:bg-surface-muted">
            Sort: {sort} <ChevronDown className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SORTS.map((s) => (
              <DropdownMenuItem key={s} onClick={() => setSort(s)}>{s}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bulk selection bar */}
      {hasSelection && (
        <div className="flex items-center gap-2 rounded-[9px] border border-accent-border bg-accent-100 px-3 py-2">
          <span className="text-[12.5px] font-[550] text-accent-700">
            {selectedPromptIds.length} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu onOpenChange={(o) => o && loadMoveFolders()}>
              <DropdownMenuTrigger
                disabled={isProcessing}
                className="flex items-center gap-1.5 rounded-[7px] border border-line-200 bg-surface-card px-2.5 py-1.5 text-[12px] font-[550] text-ink-700 hover:bg-surface-muted"
              >
                <FolderInput className="h-3.5 w-3.5" /> Move
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                {moveOptions.map((o) => (
                  <DropdownMenuItem key={o.id ?? "root"} onClick={() => moveSelected(o.id, o.label)}>
                    {o.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={deleteSelected}
              disabled={isProcessing}
              className="flex items-center gap-1.5 rounded-[7px] border border-danger-surface bg-surface-card px-2.5 py-1.5 text-[12px] font-[550] text-danger hover:bg-danger-surface"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <PromptList
        key={`${selectedFolderId ?? "root"}-${refreshKey}`}
        selectedPromptIds={selectedPromptIds}
        onToggleSelect={toggleSelect}
        onPromptsLoaded={onPromptsLoaded}
        prompts={isInitialRender.current ? initialPrompts : undefined}
        folderId={selectedFolderId || undefined}
        searchQuery={searchQuery}
        selectedTagIds={selectedTagIds}
      />
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-[12px] font-[500] transition-colors",
        active
          ? "bg-accent-500 text-white"
          : "border border-line-200 bg-surface-card text-ink-600 hover:bg-surface-muted"
      )}
    >
      {children}
    </button>
  );
}
