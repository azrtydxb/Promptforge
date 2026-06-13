"use client";

import { useState } from "react";
import { Plus, Trash2, MoreHorizontal, Tag as TagIcon } from "lucide-react";
import { useModal, type TagData } from "@/hooks/use-modal-store";

interface Tag {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
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
  const { onOpen } = useModal();

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
      onSuccess: () => setTags((prev) => prev.filter((t) => t.id !== tag.id)),
    });
  };

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[21px] font-[660] tracking-[-0.02em] text-ink-900">Tags</h1>
          <p className="text-[12.5px] text-ink-400">
            {tags.length} tag{tags.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={handleCreateTag}
          className="flex items-center gap-1.5 rounded-[7px] bg-accent-500 px-3 py-2 text-[12.5px] font-[550] text-white shadow-[0_1px_2px_rgba(94,106,210,0.35)] hover:bg-[#4F5AC4]"
        >
          <Plus className="h-4 w-4" />
          New tag
        </button>
      </div>

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
                  <input type="checkbox" className="rounded-[4px] border-line-200" aria-label="Select all" />
                </th>
                <th className="px-2 py-2.5 text-left font-[600]">Tag</th>
                <th className="px-2 py-2.5 text-right font-[600]">Prompts</th>
                <th className="px-2 py-2.5 text-right font-[600]">Shared</th>
                <th className="px-2 py-2.5 text-right font-[600]">Created</th>
                <th className="w-12 px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag, i) => {
                const c = PILL_COLORS[i % PILL_COLORS.length];
                return (
                  <tr
                    key={tag.id}
                    className="group border-t border-line-100 hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        className="rounded-[4px] border-line-200"
                        aria-label={`Select ${tag.name}`}
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
                      —
                    </td>
                    <td className="px-2 py-2.5 text-right text-[12px] tabular-nums text-ink-400">
                      {new Date(tag.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
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
                        <button
                          aria-label="More"
                          className="flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-400 hover:bg-surface-muted hover:text-ink-700"
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
