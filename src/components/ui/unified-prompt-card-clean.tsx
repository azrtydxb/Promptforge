"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ArrowRight, Hash } from "lucide-react";
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
  lastUsedAt?: Date | null;
  favoritedAt?: Date;
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

  // Type guards
  const isTemplate = (d: BasePromptData): d is TemplatePromptData => variant === "template";
  const isShared = (d: BasePromptData): d is SharedPromptData => variant === "shared";

  // Get unified data
  const title = isTemplate(data) ? data.name : data.title;
  const tags = isShared(data) ? data.prompt?.tags : data.tags;

  // Handlers
  const handleCardClick = (e: React.MouseEvent) => {
    if (variant === "personal" && onPromptClick) {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[role="button"]')) {
        e.preventDefault();
        return;
      }
      onPromptClick(data.id);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isShared(data) || isLiking) return;
    
    setIsLiking(true);
    const newIsLiked = !data.isLiked;
    
    try {
      // Use promptId for shared prompts, not the sharedPrompt id
      const result = await togglePromptLike(data.promptId);
      if (result.success && onLikeToggle) {
        onLikeToggle(data.id, newIsLiked);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  // Card wrapper
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (variant === "personal") {
      if (disableLink) {
        return (
          <div
            className="h-full"
            role={onPromptClick ? "button" : undefined}
            tabIndex={onPromptClick ? 0 : undefined}
            onClick={(event) => {
              if (!onPromptClick) return;
              event.preventDefault();
              onPromptClick(data.id);
            }}
            onKeyDown={(event) => {
              if (!onPromptClick) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onPromptClick(data.id);
              }
            }}
          >
            {children}
          </div>
        );
      }
      return (
        <Link
          href={`/prompts/${data.id}`}
          onClick={handleCardClick}
          className="block h-full"
        >
          {children}
        </Link>
      );
    }
    return <div className="h-full">{children}</div>;
  };

  return (
    <CardWrapper>
      <Card
        className={cn(
          "group rounded-lg border bg-card hover:shadow-lg transition-all duration-200 h-full flex flex-col min-h-[240px] cursor-pointer hover:border-[#546ee5]/30",
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold text-foreground line-clamp-2 min-h-[3rem] leading-snug break-words">
              {title}
            </CardTitle>
            
            {/* Tags display */}
            {((tags && tags.length > 0) || (isTemplate(data) && data.category)) && (
              <div className="flex items-start gap-1 mt-2">
                <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1 text-xs">
                  {isTemplate(data) && data.category && (
                    <span className="text-xs text-muted-foreground">
                      {data.category}
                    </span>
                  )}
                  {tags && tags.slice(0, 3).map((tag, index) => (
                    <span key={tag.id} className="text-xs text-muted-foreground">
                      {index === 0 && isTemplate(data) && data.category ? ", " : ""}
                      {tag.name}
                      {index < Math.min(tags.length - 1, 2) && ", "}
                    </span>
                  ))}
                  {tags && tags.length > 3 && (
                    <span className="text-xs text-muted-foreground">
                      +{tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col space-y-3">
          {/* Description */}
          {data.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
              {data.description}
            </p>
          )}
          
          {/* Variables for templates only */}
          {isTemplate(data) && data.variables && data.variables.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Variables:</span> {data.variables.slice(0, 3).join(", ")}
              {data.variables.length > 3 && ` +${data.variables.length - 3}`}
            </div>
          )}
          
          {/* Bottom section with consistent layout */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {/* Only show likes for shared prompts */}
              {variant === "shared" && isShared(data) && (
                <button
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all cursor-pointer"
                  onClick={handleLike}
                  disabled={isLiking}
                  type="button"
                >
                  <Heart className={cn(
                    "h-3.5 w-3.5 transition-colors",
                    data.isLiked ? "fill-[hsl(var(--destructive))] text-[hsl(var(--destructive))]" : "hover:text-[hsl(var(--destructive))]"
                  )} />
                  <span>{data.likeCount}</span>
                </button>
              )}
              
              {/* Author for shared/template */}
              {isTemplate(data) && data.author && (
                <span className="text-xs text-muted-foreground">
                  {data.author.username || 'Anonymous'}
                </span>
              )}
              {isShared(data) && (
                <span className="text-xs text-muted-foreground">
                  {data.author.username || data.author.name || 'Anonymous'}
                </span>
              )}
            </div>
            
            {/* Action button */}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-3 text-xs hover:text-[hsl(var(--primary))] group-hover:text-[hsl(var(--primary))]"
              onClick={(e) => {
                if (variant === "template" && isTemplate(data)) {
                  e.preventDefault();
                  e.stopPropagation();
                  onUseTemplate?.(data);
                } else if (variant === "shared") {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = `/shared-prompts/${data.id}`;
                }
              }}
            >
              {variant === "personal" && "Open"}
              {variant === "template" && "Use Template"}
              {variant === "shared" && "View"}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}
