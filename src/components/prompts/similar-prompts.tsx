"use client";

import { useState, useEffect } from "react";
import { getSimilarPrompts } from "@/app/actions/search.actions";
import { PromptCard } from "./prompt-card";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface SimilarPromptsProps {
  promptId: string;
  className?: string;
}

export function SimilarPrompts({ promptId, className }: SimilarPromptsProps) {
  const [prompts, setPrompts] = useState<Array<{
    id: string;
    title: string;
    description: string | null;
    similarity: number;
    tags: Array<{ id: string; name: string }>;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const loadSimilarPrompts = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const results = await getSimilarPrompts(promptId, 8);
        setPrompts(results);
      } catch (err) {
        console.error('Error loading similar prompts:', err);
        setError('Failed to load similar prompts');
      } finally {
        setIsLoading(false);
      }
    };

    loadSimilarPrompts();
  }, [promptId]);

  if (error) {
    return null; // Silently fail for similar prompts
  }

  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Similar Prompts</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (prompts.length === 0) {
    return null;
  }

  const displayedPrompts = showAll ? prompts : prompts.slice(0, 4);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Similar Prompts</h3>
        </div>
        {prompts.length > 4 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : `Show All (${prompts.length})`}
          </Button>
        )}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {displayedPrompts.map((prompt) => (
          <div key={prompt.id} className="relative">
            <PromptCard
              prompt={{
                ...prompt,
                likeCount: 0,
                isLikedByUser: false,
                favoriteCount: 0,
                isFavoritedByUser: false
              }}
              showFavoriteButton={false}
            />
            <div className="absolute top-2 right-2 bg-primary/10 text-primary text-xs px-2 py-1 rounded">
              {(prompt.similarity * 100).toFixed(0)}% match
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}