"use client";

import { UnifiedPromptCardClean as UnifiedPromptCard } from "@/components/ui/unified-prompt-card-clean";
import type { Prompt, Tag } from "@/generated/prisma";
import { cn } from "@/lib/utils";

export type PromptGridItem = Prompt & {
  tags: Tag[];
  likeCount: number;
  isLikedByUser: boolean;
  _count?: {
    likes?: number;
    favorites?: number;
    versions?: number;
  };
  favoriteCount: number;
  isFavoritedByUser: boolean;
  isFavorited?: boolean;
  isPinned?: boolean;
  pinnedAt?: Date | null;
  favoritedAt?: Date | null;
  lastUsedAt?: Date | null;
};

interface PromptGridProps {
  prompts: PromptGridItem[];
  showFavoriteButton?: boolean;
  className?: string;
  selectedPromptIds?: string[];
  onToggleSelect?: (promptId: string) => void;
  onPromptClick?: (promptId: string) => void;
}

export function PromptGrid({
  prompts,
  className = "",
  selectedPromptIds = [],
  onToggleSelect,
  onPromptClick,
}: PromptGridProps) {
  const cardClassName = "select-none";

  const renderPrompt = (prompt: PromptGridItem) => {
    const isSelected = selectedPromptIds.includes(prompt.id);

    const handleToggle = (event?: React.MouseEvent | React.KeyboardEvent) => {
      if (!onToggleSelect) return;
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      onToggleSelect(prompt.id);
    };

    return (
      <div
        key={prompt.id}
        className={cn(
          "group relative rounded-[11px]",
          isSelected ? "ring-2 ring-accent-500" : ""
        )}
      >
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            "absolute top-3 right-3 z-20 h-5 w-5 rounded-[5px] border transition-all",
            "flex items-center justify-center text-[11px]",
            isSelected
              ? "border-accent-500 bg-accent-500 text-white opacity-100"
              : "border-line-200 bg-surface-card text-ink-400 opacity-0 group-hover:opacity-100"
          )}
          aria-pressed={isSelected}
          aria-label={isSelected ? "Deselect prompt" : "Select prompt"}
        >
          {isSelected ? "✓" : ""}
        </button>
        <UnifiedPromptCard
          variant="personal"
          data={prompt}
          className={cardClassName}
          onPromptClick={onPromptClick}
        />
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 ${className}`}>
      {prompts.map((prompt) => renderPrompt(prompt))}
    </div>
  );
}
