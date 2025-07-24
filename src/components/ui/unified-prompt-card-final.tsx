"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Star,
  Heart,
  Copy,
  Code,
  PenTool,
  MessageSquare,
  HelpCircle,
  Sparkles,
  BarChart,
  Users,
  ArrowRight,
  Hash,
  Pin,
  Eye,
  MessageCircle,
} from "lucide-react";
import { FavoriteButton } from "@/components/prompts/favorite-button";
import { PinButton } from "@/components/prompts/pin-button";
import { cn } from "@/lib/utils";
import { dellCard } from "@/lib/styles";
import { useState } from "react";
import { togglePromptLike } from "@/app/actions/likes-comments.actions";
import { copySharedPrompt } from "@/app/actions/shared-prompts.actions";

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
    avatarType: 'INITIALS' | 'GRAVATAR' | 'UPLOAD';
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
  showFavoriteButton?: boolean;
  onPromptClick?: (promptId: string) => void;
  onUseTemplate?: (template: TemplatePromptData) => void;
  onLikeToggle?: (id: string, isLiked: boolean) => void;
  onCopy?: (id: string) => void;
  showAuthor?: boolean;
}

const categoryIcons: Record<string, React.ElementType> = {
  coding: Code,
  writing: PenTool,
  chat: MessageSquare,
  analysis: BarChart,
  creative: Sparkles,
  business: Users,
  other: HelpCircle,
};

export function UnifiedPromptCardFinal({
  variant,
  data,
  className,
  showFavoriteButton = true,
  onPromptClick,
  onUseTemplate,
  onLikeToggle,
  onCopy,
  showAuthor = true,
}: UnifiedPromptCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Type guards
  const isPersonal = (d: any): d is PersonalPromptData => variant === "personal";
  const isTemplate = (d: any): d is TemplatePromptData => variant === "template";
  const isShared = (d: any): d is SharedPromptData => variant === "shared";

  // Get unified data
  const title = isTemplate(data) ? data.name : data.title;
  const tags = isShared(data) ? data.prompt?.tags : data.tags;
  const isPinned = isPersonal(data) ? data.isPinned : false;
  const isFavorited = isPersonal(data) ? data.isFavorited : false;

  // Get icon
  const getIcon = () => {
    if (isTemplate(data)) {
      const Icon = categoryIcons[data.category] || categoryIcons.other;
      return <Icon className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

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
      const result = await togglePromptLike(data.id);
      if (result.success && onLikeToggle) {
        onLikeToggle(data.id, newIsLiked);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isShared(data) || isCopying) return;
    
    setIsCopying(true);
    
    try {
      const result = await copySharedPrompt(data.id);
      if (result.success && onCopy) {
        onCopy(data.id);
      }
    } catch (error) {
      console.error('Error copying prompt:', error);
    } finally {
      setIsCopying(false);
    }
  };

  // Card wrapper
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (variant === "personal") {
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
          dellCard('interactive'),
          "bg-card/50 dark:bg-card/30 h-full flex flex-col",
          isPinned && "border-primary/50 bg-primary/5",
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
                {getIcon()}
              </div>
              <div className="flex-1">
                <CardTitle className="text-base font-semibold line-clamp-1">{title}</CardTitle>
                
                {/* Unified Tags Display */}
                {((tags && tags.length > 0) || (isTemplate(data) && data.category)) && (
                  <div className="flex items-center gap-1 mt-1">
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    {isTemplate(data) && data.category && (
                      <span className="text-xs text-muted-foreground">
                        {data.category}
                        {tags && tags.length > 0 && ", "}
                      </span>
                    )}
                    {tags && tags.map((tag, index) => (
                      <span key={tag.id} className="text-xs text-muted-foreground">
                        {tag.name}{index < tags.length - 1 && ", "}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Rating or Action buttons */}
            {isTemplate(data) && data.rating && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-3 w-3 fill-current text-yellow-500" />
                {data.rating.toFixed(1)}
              </div>
            )}
            
            {variant === "personal" && isPersonal(data) && isPinned && (
              <Badge variant="secondary" className="gap-1">
                <Pin className="h-3 w-3" />
                Pinned
              </Badge>
            )}
            
            {variant === "shared" && isShared(data) && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleLike}
                  disabled={isLiking}
                >
                  <Heart className={cn("h-4 w-4", data.isLiked && "fill-current text-red-500")} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopy}
                  disabled={isCopying}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 flex-1">
          {/* Description - more prominent */}
          {data.description && (
            <p className="text-sm text-foreground/80 line-clamp-3">
              {data.description}
            </p>
          )}
          
          {/* Variables for templates */}
          {isTemplate(data) && data.variables && data.variables.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Variables:
              </p>
              <div className="flex flex-wrap gap-1">
                {data.variables.map((variable, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {`{{${variable}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Example for templates */}
          {isTemplate(data) && data.example && (
            <div className="p-3 bg-muted/50 rounded-md">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Example:
              </p>
              <p className="text-xs text-foreground/80 line-clamp-2">
                {data.example}
              </p>
            </div>
          )}
          
          {/* Bottom section */}
          <div className="flex items-center justify-between pt-2 mt-auto">
            {/* Stats */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {/* Only show likes for all variants */}
              {variant === "shared" && isShared(data) && (
                <>
                  <Heart className="h-3 w-3" />
                  <span>{data.likeCount} likes</span>
                </>
              )}
              
              {/* Subtle author display */}
              {showAuthor && (
                <>
                  {isTemplate(data) && data.author && (
                    <span className="text-xs text-muted-foreground/70">
                      by {data.author.username || 'Anonymous'}
                    </span>
                  )}
                  {isShared(data) && (
                    <span className="text-xs text-muted-foreground/70">
                      by {data.author.username || data.author.name || 'Anonymous'}
                    </span>
                  )}
                </>
              )}
            </div>
            
            {/* Action button */}
            <Button
              size="sm"
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
          
          {/* Additional actions for personal prompts */}
          {variant === "personal" && isPersonal(data) && (
            <div className="flex gap-2 pt-2 border-t">
              <PinButton
                promptId={data.id}
                isPinned={!!isPinned}
                size="sm"
                className="flex-1"
              />
              {showFavoriteButton && (
                <FavoriteButton
                  promptId={data.id}
                  isFavorited={!!isFavorited}
                  size="sm"
                  className="flex-1"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </CardWrapper>
  );
}