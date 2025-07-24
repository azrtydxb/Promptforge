"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Star,
  History,
  Heart,
  Calendar,
  ArrowRight,
  Clock,
  Hash,
  Pin,
} from "lucide-react";
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
}

export function PromptCard({ 
  prompt, 
  showFavoriteButton = true,
  isFavorited = false,
  className 
}: PromptCardProps) {
  const getTimeDisplay = () => {
    if (prompt.lastUsedAt) {
      return {
        icon: Clock,
        text: `Used ${formatDistanceToNow(new Date(prompt.lastUsedAt))} ago`,
      };
    }
    return {
      icon: Calendar,
      text: `Created ${formatDistanceToNow(new Date(prompt.createdAt))} ago`,
    };
  };

  const timeDisplay = getTimeDisplay();

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-all duration-200 cursor-pointer group",
        prompt.isPinned ? "border-primary/50 bg-primary/5" : "border-gray-200 dark:border-gray-800",
        className
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-lg",
                "bg-muted",
                "group-hover:bg-primary/10",
                "transition-colors"
              )}
            >
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-1">{prompt.title}</CardTitle>
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  {prompt.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-xs">
                      {tag.name}
                    </Badge>
                  ))}
                  {prompt.tags.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{prompt.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {prompt.isPinned && (
              <Badge variant="secondary" className="text-xs">
                <Pin className="h-3 w-3 mr-1" />
                Pinned
              </Badge>
            )}
            <div onClick={(e) => e.stopPropagation()}>
              <PinButton
                promptId={prompt.id}
                isPinned={prompt.isPinned || false}
                size="sm"
                variant="ghost"
              />
            </div>
            {showFavoriteButton && (
              <div onClick={(e) => e.stopPropagation()}>
                <FavoriteButton
                  promptId={prompt.id}
                  isFavorited={isFavorited || prompt.isFavorited || false}
                  favoriteCount={prompt._count?.favorites}
                  size="sm"
                  variant="ghost"
                  showCount={false}
                  iconClasses="h-4 w-4"
                />
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {prompt.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {prompt.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {prompt._count?.likes !== undefined && prompt._count.likes > 0 && (
              <div className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                <span>{prompt._count.likes}</span>
              </div>
            )}
            {prompt._count?.versions !== undefined && prompt._count.versions > 0 && (
              <div className="flex items-center gap-1">
                <History className="h-3 w-3" />
                <span>{prompt._count.versions} versions</span>
              </div>
            )}
            {prompt._count?.favorites !== undefined && prompt._count.favorites > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3" />
                <span>{prompt._count.favorites}</span>
              </div>
            )}
          </div>
          <Link
            href={`/prompts/${prompt.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="ghost"
              className="group-hover:bg-primary group-hover:text-primary-foreground"
            >
              Open
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <timeDisplay.icon className="h-3 w-3" />
          <span>{timeDisplay.text}</span>
        </div>
      </CardContent>
    </Card>
  );
}