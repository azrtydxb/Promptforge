"use client";

import Link from "next/link";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export interface SharedWithMeCardData {
  id: string;
  teamId: string;
  title: string;
  description: string | null;
  content: string | null;
  createdAt: Date;
  viewCount: number;
  copyCount: number;
  accessLabel: "Can edit" | "Can view";
  tags: Array<{ id: string; name: string }>;
  sharedBy: {
    name: string | null;
    username: string | null;
    profilePicture: string | null;
  } | null;
}

const ACCESS_CLASSES = {
  "Can edit": "bg-accent-100 text-accent-700",
  "Can view": "bg-[#F1F2F5] text-ink-600",
} as const;

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function SharedWithMeCard({ data }: { data: SharedWithMeCardData }) {
  const { onOpen } = useModal();

  const sharerName =
    data.sharedBy?.name || data.sharedBy?.username || "a teammate";

  const handlePreview = () => {
    onOpen("quickPreview", {
      quickPreview: {
        promptId: data.id,
        openHref: `/teams/${data.teamId}/prompts`,
        title: data.title,
        content: data.content ?? "",
        author: { name: sharerName, avatar: data.sharedBy?.profilePicture ?? undefined },
        views: data.viewCount,
        copies: data.copyCount,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-[11px] border border-line-200 bg-surface-card p-4 transition-shadow hover:shadow-[0_12px_32px_-12px_rgba(27,29,34,0.22)]">
      {/* Header: title + access badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-[620] tracking-[-0.01em] text-ink-900">
            {data.title}
          </h3>
          {data.description && (
            <p className="mt-0.5 line-clamp-2 text-[12px] leading-[1.5] text-ink-600">
              {data.description}
            </p>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-[550]",
            ACCESS_CLASSES[data.accessLabel]
          )}
        >
          {data.accessLabel}
        </span>
      </div>

      {/* Shared by row */}
      <div className="flex items-center gap-1.5">
        {data.sharedBy?.profilePicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.sharedBy.profilePicture}
            alt={sharerName}
            className="h-4 w-4 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#DFE2F6] text-[8px] font-[600] text-accent-700">
            {initials(sharerName)}
          </span>
        )}
        <span className="text-[11.5px] text-ink-400">
          Shared by {sharerName} ·{" "}
          {formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Tags */}
      {data.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="rounded-full bg-[#F1F2F5] px-2 py-0.5 text-[10px] font-[550] text-ink-600"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer actions */}
      <div className="mt-auto flex gap-2">
        <button
          type="button"
          onClick={handlePreview}
          className="flex-1 rounded-[7px] border border-line-200 bg-surface-muted py-1.5 text-[12px] font-[550] text-ink-700 transition-colors hover:bg-surface-card hover:border-accent-500 hover:text-accent-700"
        >
          Preview
        </button>
        <Link
          href={`/teams/${data.teamId}/prompts`}
          className="flex-1 rounded-[7px] bg-accent-500 py-1.5 text-center text-[12px] font-[550] text-white transition-colors hover:bg-[#4F5AC4]"
        >
          Open
        </Link>
      </div>
    </div>
  );
}
