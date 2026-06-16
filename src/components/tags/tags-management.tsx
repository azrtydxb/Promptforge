"use client";

import { useState } from "react";
import { Plus, Trash2, MoreHorizontal, Tag as TagIcon, Search, Edit2 } from "lucide-react";
import { useModal, type TagData } from "@/hooks/use-modal-store";
import { TopbarPortal } from "@/components/layout/topbar-portal";
import { TopbarTitle, TopbarNewButton } from "@/components/layout/topbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Tag {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  sharedCount?: number;
  _count: {
    prompts: number;
  };
}

interface TagsManagementProps {
  initialTags: Tag[];
}

// Deterministic pill color per tag (Structured Pro palette).
const PILL_COLORS = [
  { bg: "#EEF0FB", fg: "#3F49B8" },
  { bg: "#E8F4EE", fg: "#3A9D6E" },
  { bg: "#FBF2E6", fg: "#D98C3F" },
  { bg: "#F1ECFB", fg: "#7A5CD0" },
  { bg: "#F0D6D8", fg: "#CD5B62" },
];

export function TagsManagement({ initialTags }: TagsManagementProps) {
  const [tags, setTags] = useState(initialTags);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { onOpen } = useModal();

  // Fix 8: filter tags by search query
  const filteredTags = searchQuery.trim()
    ? tags.filter((t) => t.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : tags;

  const handleCreateTag = () => {
    onOpen("createTag", {
      onSuccess: (newTag?: TagData | void) => {
        if (newTag && typeof newTag === "object") {
          setTags((prev) => [
            ...prev,
            { ...newTag, createdAt: new Date(), _count: { prompts: 0 } },
          ]);
        }
      },
    });
  };

  const handleEditTag = (tag: Tag) => {
    onOpen("editTag", {
      tag,
      onSuccess: (updatedTag?: TagData | void) => {
        if (updatedTag && typeof updatedTag === "object") {
          setTags((prev) =>
            prev.map((t) => (t.id === updatedTag.id ? { ...t, ...updatedTag } : t))
          );
        }
      },
    });
  };

  const handleDeleteTag = (tag: Tag) => {
    onOpen("deleteTag", {
      tag,
      onSuccess: () => {
        setTags((prev) => prev.filter((t) => t.id !== tag.id));
        setSelectedIds((prev) => { const s = new Set(prev); s.delete(tag.id); return s; });
      },
    });
  };

  // Fix 10: bulk delete selected tags
  const handleBulkDelete = () => {
    const selected = tags.filter((t) => selectedIds.has(t.id));
    if (selected.length === 0) return;
    if (!confirm(`Delete ${selected.length} tag${selected.length > 1 ? 's' : ''}? This cannot be undone.`)) return;

    // Delete each tag via the modal's underlying action; for bulk we call each serially
    // using the existing deleteTag modal action.
    // Since the modal is fire-and-forget, we optimistically remove them from the UI.
    selected.forEach((tag) => {
      onOpen("deleteTag", {
        tag,
        onSuccess: () => {
          setTags((prev) => prev.filter((t) => t.id !== tag.id));
        },
      });
    });
    setSelectedIds(new Set());
  };

  // Fix 10: select-all logic against filtered set
  const allFilteredSelected =
    filteredTags.length > 0 && filteredTags.every((t) => selectedIds.has(t.id));
  const someFilteredSelected = filteredTags.some((t) => selectedIds.has(t.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const s = new Set(prev);
        filteredTags.forEach((t) => s.delete(t.id));
        return s;
      });
    } else {
      setSelectedIds((prev) => {
        const s = new Set(prev);
        filteredTags.forEach((t) => s.add(t.id));
        return s;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  return (
    <div className="space-y-4 pt-1">
      <TopbarPortal>
        <TopbarTitle>Tags</TopbarTitle>
        <span className="text-[12.5px] tabular-nums text-ink-400">{tags.length} tags</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            {/* Fix 8: wired search input */}
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags…"
              className="h-[30px] w-48 rounded-[7px] border border-line-200 bg-surface-muted pl-8 pr-3 text-[12.5px] text-ink-900 placeholder:text-[#9aa0ab] focus:outline-none"
            />
          </div>
          <TopbarNewButton label="New tag" onClick={handleCreateTag} />
        </div>
      </TopbarPortal>

      {/* Fix 10: bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-[9px] border border-line-200 bg-surface-muted px-4 py-2">
          <span className="text-[12.5px] text-ink-600">
            {selectedIds.size} selected
          </span>
          <button
            onClick={handleBulkDelete}
            className="ml-auto flex items-center gap-1.5 rounded-[7px] bg-danger-surface px-3 py-1.5 text-[12px] font-[550] text-danger hover:opacity-80 transition-opacity"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-[12px] text-ink-400 hover:text-ink-700"
          >
            Cancel
          </button>
        </div>
      )}

      {tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[11px] border border-line-200 bg-surface-card py-16">
          <TagIcon className="mb-3 h-9 w-9 text-ink-300" />
          <h3 className="text-[14px] font-[620] text-ink-900">No tags yet</h3>
          <p className="mb-4 mt-1 text-[12.5px] text-ink-400">
            Create your first tag to organize your prompts.
          </p>
          <button
            onClick={handleCreateTag}
            className="flex items-center gap-1.5 rounded-[7px] bg-accent-500 px-3 py-2 text-[12.5px] font-[550] text-white"
          >
            <Plus className="h-4 w-4" /> New tag
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[11px] border border-line-200 bg-surface-card">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-150 text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400">
                <th className="w-10 px-4 py-2.5">
                  {/* Fix 10: select-all checkbox */}
                  <input
                    type="checkbox"
                    className="rounded-[4px] border-line-200"
                    aria-label="Select all"
                    checked={allFilteredSelected}
                    ref={(el) => { if (el) el.indeterminate = someFilteredSelected && !allFilteredSelected; }}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-2 py-2.5 text-left font-[600]">Tag</th>
                <th className="px-2 py-2.5 text-right font-[600]">Prompts</th>
                <th className="px-2 py-2.5 text-right font-[600]">Shared</th>
                <th className="px-2 py-2.5 text-right font-[600]">Created</th>
                <th className="w-12 px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTags.map((tag, i) => {
                const c = PILL_COLORS[i % PILL_COLORS.length];
                return (
                  <tr
                    key={tag.id}
                    className="group border-t border-line-100 hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-2.5">
                      {/* Fix 10: per-row checkbox */}
                      <input
                        type="checkbox"
                        className="rounded-[4px] border-line-200"
                        aria-label={`Select ${tag.name}`}
                        checked={selectedIds.has(tag.id)}
                        onChange={() => toggleSelect(tag.id)}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <button onClick={() => handleEditTag(tag)} className="inline-flex">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-[550]"
                          style={{ background: c.bg, color: c.fg }}
                        >
                          {tag.name}
                        </span>
                      </button>
                    </td>
                    <td className="px-2 py-2.5 text-right text-[12.5px] tabular-nums text-ink-700">
                      {tag._count.prompts}
                    </td>
                    <td className="px-2 py-2.5 text-right text-[12.5px] tabular-nums text-ink-400">
                      {tag.sharedCount ? tag.sharedCount : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-right text-[12px] tabular-nums text-ink-400">
                      {new Date(tag.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => handleDeleteTag(tag)}
                          aria-label="Delete tag"
                          className="flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-400 hover:bg-danger-surface hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        {/* Fix 9: ⋯ button opens a dropdown with Edit and Delete */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              aria-label="More"
                              className="flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-400 hover:bg-surface-muted hover:text-ink-700"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTag(tag)}>
                              <Edit2 className="mr-2 h-3.5 w-3.5" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteTag(tag)}
                              className="text-danger focus:text-danger"
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredTags.length === 0 && searchQuery && (
            <div className="py-8 text-center text-[13px] text-ink-400">
              No tags match &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
