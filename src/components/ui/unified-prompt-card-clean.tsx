"use client";

import Link from "next/link";
import { Heart, ArrowRight, Eye, FileText, LayoutTemplate, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { togglePromptLike } from "@/app/actions/likes-comments.actions";

export type PromptCardVariant = "personal" | "template" | "shared";

interface BasePromptData {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  tags?: Array<{ id: string; name: string }>;
}

interface PersonalPromptData extends BasePromptData {
  createdAt: Date;
  updatedAt: Date;
  usageCount?: number;
  lastUsedAt?: Date | null;
  favoritedAt?: Date | null;
  isFavorited?: boolean;
  pinnedAt?: Date | null;
  isPinned?: boolean;
  _count?: {
    likes?: number;
    favorites?: number;
    versions?: number;
  };
}

interface TemplatePromptData extends BasePromptData {
  name: string;
  category: string;
  variables?: string[];
  example?: string | null;
  usageCount?: number;
  rating?: number | null;
  isPublic?: boolean;
  authorId?: string;
  author?: {
    id: string;
    username: string | null;
    image: string | null;
  };
}

interface SharedPromptData extends BasePromptData {
  promptId: string;
  publishedAt: Date | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  copyCount: number;
  isLiked?: boolean;
  author: {
    id: string;
    username: string | null;
    name: string | null;
    avatarType: string;
    profilePicture: string | null;
  };
  prompt?: {
    tags: Array<{ id: string; name: string }>;
  };
}

interface UnifiedPromptCardProps {
  variant: PromptCardVariant;
  data: PersonalPromptData | TemplatePromptData | SharedPromptData;
  className?: string;
  onPromptClick?: (promptId: string) => void;
  onUseTemplate?: (template: TemplatePromptData) => void;
  onLikeToggle?: (id: string, isLiked: boolean) => void;
  onCopy?: (id: string) => void;
  disableLink?: boolean;
}

const VARIANT_ICON = {
  personal: FileText,
  template: LayoutTemplate,
  shared: Store,
};

export function UnifiedPromptCardClean({
  variant,
  data,
  className,
  onPromptClick,
  onUseTemplate,
  onLikeToggle,
  disableLink = false,
}: UnifiedPromptCardProps) {
  const [isLiking, setIsLiking] = useState(false);

  const isTemplate = (d: BasePromptData): d is TemplatePromptData => variant === "template";
  const isShared = (d: BasePromptData): d is SharedPromptData => variant === "shared";

  const title = isTemplate(data) ? data.name : data.title;
  const tags = isShared(data) ? data.prompt?.tags : data.tags;
  const Icon = VARIANT_ICON[variant];

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isShared(data) || isLiking) return;
    setIsLiking(true);
    const newIsLiked = !data.isLiked;
    try {
      const result = await togglePromptLike(data.promptId);
      if (result.success && onLikeToggle) onLikeToggle(data.id, newIsLiked);
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setIsLiking(false);
    }
  };

  const actionLabel =
    variant === "personal" ? "Open" : variant === "template" ? "Use" : "Copy";

  return (
    <div
      className={cn(
        "group flex h-full min-h-[200px] flex-col rounded-[11px] border border-line-200 bg-surface-card p-4 transition-shadow hover:shadow-[0_12px_32px_-12px_rgba(27,29,34,0.22)]",
        className
      )}
    >
      {/* Header: icon tile + badge */}
      <div className="mb-2.5 flex items-start justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent-100">
          <Icon className="h-[17px] w-[17px] text-accent-500" />
        </span>
        {isTemplate(data) && data.category && (
          <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-[550] text-accent-700">
            {data.category}
          </span>
        )}
      </div>

      {/* Title */}
      <Link
        href={variant === "shared" ? `/shared-prompts/${data.id}` : `/prompts/${data.id}`}
        onClick={(e) => {
          if (variant === "personal" && onPromptClick) {
            e.preventDefault();
            onPromptClick(data.id);
          }
        }}
        className="text-[14px] font-[620] leading-snug tracking-[-0.01em] text-ink-900 hover:text-accent-700"
      >
        <span className="line-clamp-2">{title}</span>
      </Link>

      {/* Description */}
      {data.description && (
        <p className="mt-1.5 line-clamp-2 flex-1 text-[12px] leading-[1.5] text-ink-600">
          {data.description}
        </p>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
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
        <div className="flex items-center gap-2.5 text-[11px] text-ink-400">
          {isShared(data) && (
            <>
              <span className="flex items-center gap-1 tabular-nums">
                <Eye className="h-3 w-3" /> {data.viewCount}
              </span>
              <button
                type="button"
                onClick={handleLike}
                disabled={isLiking}
                className="flex items-center gap-1 tabular-nums hover:text-danger"
              >
                <Heart
                  className={cn("h-3 w-3", data.isLiked && "fill-danger text-danger")}
                />
                {data.likeCount}
              </button>
            </>
          )}
          {isTemplate(data) && (
            <span className="tabular-nums">Used {data.usageCount ?? 0} times</span>
          )}
          {variant === "personal" && (
            <span className="tabular-nums">
              {((data as PersonalPromptData).usageCount ?? 0)} uses
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {variant === "personal" && (
            <Link
              href={`/prompts/${data.id}`}
              aria-label="Preview"
              className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-line-200 text-ink-600 hover:border-accent-500 hover:text-accent-700"
            >
              <Eye className="h-3.5 w-3.5" />
            </Link>
          )}
          <button
            type="button"
            onClick={(e) => {
              if (variant === "template" && isTemplate(data)) {
                e.preventDefault();
                e.stopPropagation();
                onUseTemplate?.(data);
              } else if (variant === "shared") {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = `/shared-prompts/${data.id}`;
              } else if (variant === "personal") {
                window.location.href = `/prompts/${data.id}`;
              }
            }}
            className="flex items-center gap-1 text-[12px] font-[550] text-accent-700 hover:text-accent-500"
          >
            {actionLabel} <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
