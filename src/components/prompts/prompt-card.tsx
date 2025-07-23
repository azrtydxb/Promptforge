"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/ui/icons";
import { FavoriteButton } from "./favorite-button";
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
}

export function PromptCard({ 
  prompt, 
  showFavoriteButton = true,
  isFavorited = false,
  className 
}: PromptCardProps) {
  const truncateDescription = (text: string | null, maxLength = 150) => {
    if (!text) return "No description available";
    return text.length > maxLength 
      ? text.substring(0, maxLength) + "..." 
      : text;
  };

  return (
    <Card className={cn(
      "hover:shadow-lg transition-shadow duration-200",
      className
    )}>
      <Link href={`/prompts/${prompt.id}`} className="block">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg line-clamp-1">
              {prompt.title}
            </h3>
            {showFavoriteButton && (
              <div onClick={(e) => e.preventDefault()}>
                <FavoriteButton
                  promptId={prompt.id}
                  isFavorited={isFavorited || prompt.isFavorited || false}
                  favoriteCount={prompt._count?.favorites}
                  size="sm"
                  variant="ghost"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {truncateDescription(prompt.description)}
          </p>
          {prompt.tags && prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {prompt.tags.slice(0, 3).map((tag) => (
                <Badge 
                  key={tag.id} 
                  variant="secondary"
                  className="text-xs"
                >
                  {tag.name}
                </Badge>
              ))}
              {prompt.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{prompt.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-3 pb-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-4 w-full">
            {prompt._count?.likes !== undefined && (
              <div className="flex items-center gap-1">
                <Icons.Heart className="h-3 w-3" />
                <span>{prompt._count.likes}</span>
              </div>
            )}
            {prompt._count?.favorites !== undefined && (
              <div className="flex items-center gap-1">
                <Icons.Star className="h-3 w-3" />
                <span>{prompt._count.favorites}</span>
              </div>
            )}
            {prompt._count?.versions !== undefined && (
              <div className="flex items-center gap-1">
                <Icons.History className="h-3 w-3" />
                <span>{prompt._count.versions}</span>
              </div>
            )}
            <div className="ml-auto">
              {prompt.favoritedAt ? (
                <span>Favorited {formatDistanceToNow(new Date(prompt.favoritedAt))} ago</span>
              ) : prompt.lastUsedAt ? (
                <span>Used {formatDistanceToNow(new Date(prompt.lastUsedAt))} ago</span>
              ) : (
                <span>Created {formatDistanceToNow(new Date(prompt.createdAt))} ago</span>
              )}
            </div>
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}