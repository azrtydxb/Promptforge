"use client";

import { PromptCard } from "./prompt-card";
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
}

export function PromptGrid({ 
  prompts, 
  showFavoriteButton = true,
  className = ""
}: PromptGridProps) {
  return (
    <div className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {prompts.map((prompt) => (
        <PromptCard
          key={prompt.id}
          prompt={prompt}
          showFavoriteButton={showFavoriteButton}
        />
      ))}
    </div>
  );
}