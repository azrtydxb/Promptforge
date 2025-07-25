"use client";

import { UnifiedPromptCardClean as UnifiedPromptCard } from "@/components/ui/unified-prompt-card-clean";
import type { Prompt, Tag } from "@/generated/prisma";

interface PromptGridProps {
  prompts: Array<Prompt & {
    tags: Tag[];
    likeCount?: number;
    isLikedByUser?: boolean;
    _count?: {
      likes?: number;
      favorites?: number;
      versions?: number;
    };
  }>;
  showFavoriteButton?: boolean;
  className?: string;
  onPromptClick?: (promptId: string) => void;
}

export function PromptGrid({ 
  prompts, 
  className = "",
  onPromptClick
}: PromptGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 ${className}`}>
      {prompts.map((prompt) => (
        <UnifiedPromptCard
          key={prompt.id}
          variant="personal"
          data={prompt}
          onPromptClick={onPromptClick}
        />
      ))}
    </div>
  );
}