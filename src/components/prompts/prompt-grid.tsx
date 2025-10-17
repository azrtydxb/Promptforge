"use client";

import { UnifiedPromptCardClean as UnifiedPromptCard } from "@/components/ui/unified-prompt-card-clean";
import type { Prompt, Tag } from "@/generated/prisma";
import { cn } from "@/lib/utils";

export type PromptGridItem = Prompt & {
  tags: Tag[];
  likeCount?: number;
  isLikedByUser?: boolean;
  _count?: {
    likes?: number;
    favorites?: number;
    versions?: number;
  };
  favoriteCount?: number;
  isFavoritedByUser?: boolean;
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
          "relative",
          isSelected ? "ring-2 ring-[#546ee5]" : ""
        )}
      >
        <button
          type="button"
          onClick={handleToggle}
          className={cn(
            "absolute top-2 right-2 z-20 h-6 w-6 rounded-full border border-muted-foreground/40 bg-background/90",
            "flex items-center justify-center text-sm transition-colors",
            isSelected ? "bg-[#546ee5] text-white" : "text-muted-foreground"
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
