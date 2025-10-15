"use client";

import { useState } from "react";
import { togglePromptFavorite } from "@/app/actions/prompt-favorites.actions";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FavoriteButtonProps {
  promptId: string;
  isFavorited: boolean;
  favoriteCount?: number;
  showCount?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "default";
  className?: string;
}

export function FavoriteButton({
  promptId,
  isFavorited: initialFavorited,
  favoriteCount = 0,
  showCount = false,
  size = "default",
  variant = "ghost",
  className,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);
  const [optimisticCount, setOptimisticCount] = useState(favoriteCount);

  const handleToggleFavorite = async () => {
    if (isLoading) return;

    setIsLoading(true);
    
    // Optimistic update
    const newFavorited = !isFavorited;
    setIsFavorited(newFavorited);
    setOptimisticCount(prev => newFavorited ? prev + 1 : prev - 1);

    try {
      const result = await togglePromptFavorite(promptId);
      
      // Update with actual result
      setIsFavorited(result.favorited);
      
      toast.success(
        result.favorited 
          ? "Added to favorites" 
          : "Removed from favorites"
      );
    } catch (error) {
      // Revert optimistic update on error
      setIsFavorited(!newFavorited);
      setOptimisticCount(favoriteCount);
      
      toast.error("Failed to update favorite");
      console.error("Error toggling favorite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const iconClasses = cn(
    size === "sm" && "h-3 w-3",
    size === "default" && "h-4 w-4",
    size === "lg" && "h-5 w-5"
  );

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={cn(
        "gap-1.5",
        isFavorited && "text-yellow-600 hover:text-yellow-700",
        className
      )}
    >
      <Star
        className={cn(
          iconClasses,
          isFavorited && "fill-current"
        )}
      />
      {showCount && (
        <span className="text-xs">
          {optimisticCount > 0 ? optimisticCount : ""}
        </span>
      )}
    </Button>
  );
}