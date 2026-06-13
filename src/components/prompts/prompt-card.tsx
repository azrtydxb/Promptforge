"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { FileText, ArrowRight, Eye, Pin } from "lucide-react";
import { FavoriteButton } from "./favorite-button";
import { PinButton } from "./pin-button";
import { cn } from "@/lib/utils";

interface PromptCardProps {
  prompt: {
    id: string;
    title: string;
    description: string | null;
    content: string | null;
    createdAt: Date;
    updatedAt: Date;
    lastUsedAt?: Date | null;
    favoritedAt?: Date;
    isFavorited?: boolean;
    pinnedAt?: Date | null;
    isPinned?: boolean;
    tags?: Array<{ id: string; name: string }>;
    _count?: {
      likes?: number;
      favorites?: number;
      versions?: number;
    };
  };
  showFavoriteButton?: boolean;
  isFavorited?: boolean;
  className?: string;
  onPromptClick?: (promptId: string) => void;
}

export function PromptCard({
  prompt,
  showFavoriteButton = true,
  onPromptClick,
  isFavorited = false,
  className,
}: PromptCardProps) {
  const uses = prompt._count?.likes ?? 0;
  const versions = prompt._count?.versions ?? 0;
  const meta =
    [uses > 0 ? `${uses} uses` : null, versions > 0 ? `v${versions}` : null]
      .filter(Boolean)
      .join(" · ") ||
    `Created ${formatDistanceToNow(new Date(prompt.createdAt))} ago`;

  return (
    <div
      className={cn(
        "group flex flex-col rounded-[11px] border bg-surface-card p-4 transition-shadow hover:shadow-[0_12px_32px_-12px_rgba(27,29,34,0.22)]",
        prompt.isPinned ? "border-accent-500/40" : "border-line-200",
        className
      )}
    >
      {/* Header */}
      <div className="mb-2.5 flex items-start justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent-100">
          <FileText className="h-[17px] w-[17px] text-accent-500" />
        </span>
        <div className="flex items-center gap-1">
          {prompt.isPinned && (
            <span className="flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-[550] text-accent-700">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          )}
          <PinButton
            promptId={prompt.id}
            isPinned={prompt.isPinned || false}
            size="sm"
            variant="ghost"
          />
          {showFavoriteButton && (
            <FavoriteButton
              promptId={prompt.id}
              isFavorited={isFavorited || prompt.isFavorited || false}
              favoriteCount={prompt._count?.favorites}
              size="sm"
              variant="ghost"
              showCount={false}
            />
          )}
        </div>
      </div>

      {/* Title + description */}
      <Link
        href={`/prompts/${prompt.id}`}
        onClick={() => onPromptClick?.(prompt.id)}
        className="text-[14px] font-[620] leading-snug tracking-[-0.01em] text-ink-900 hover:text-accent-700"
      >
        <span className="line-clamp-1">{prompt.title}</span>
      </Link>
      {prompt.description && (
        <p className="mt-1.5 line-clamp-2 flex-1 text-[12px] leading-[1.5] text-ink-600">
          {prompt.description}
        </p>
      )}

      {/* Tags */}
      {prompt.tags && prompt.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {prompt.tags.slice(0, 3).map((tag) => (
            <span
              key={tag.id}
              className="rounded-full bg-[#F1F2F5] px-2 py-0.5 text-[10px] font-[550] text-ink-600"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-[#F0F1F4] pt-[11px]">
        <span className="text-[11px] tabular-nums text-ink-400">{meta}</span>
        <div className="flex items-center gap-2">
          <Link
            href={`/prompts/${prompt.id}`}
            aria-label="Preview"
            className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-line-200 text-ink-600 transition-colors hover:border-accent-500 hover:text-accent-700"
          >
            <Eye className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={`/prompts/${prompt.id}`}
            className="flex items-center gap-1 text-[12px] font-[550] text-accent-700 hover:text-accent-500"
          >
            Open <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
