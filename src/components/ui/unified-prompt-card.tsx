"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  FileText,
  Star,
  Heart,
  Calendar,
  ArrowRight,
  Clock,
  Hash,
  Pin,
  Eye,
  MessageCircle,
  Copy,
  Code,
  PenTool,
  MessageSquare,
  HelpCircle,
  Sparkles,
  BarChart,
  Users,
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
  name: string; // Templates use 'name' instead of 'title'
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
  
  // Personal prompt specific props
  showFavoriteButton?: boolean;
  onPromptClick?: (promptId: string) => void;
  
  // Template specific props
  onUseTemplate?: (template: TemplatePromptData) => void;
  
  // Shared prompt specific props
  onLikeToggle?: (id: string, isLiked: boolean) => void;
  onCopy?: (id: string) => void;
  showAuthor?: boolean;
}

// Category icon mapping for templates
const categoryIcons: Record<string, React.ElementType> = {
  coding: Code,
  writing: PenTool,
  chat: MessageSquare,
  analysis: BarChart,
  creative: Sparkles,
  business: Users,
  other: HelpCircle,
};

export function UnifiedPromptCard({
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

  // Get appropriate data based on variant
  const title = isTemplate(data) ? data.name : data.title;
  const tags = isShared(data) ? data.prompt?.tags : data.tags;
  const isPinned = isPersonal(data) ? data.isPinned : false;
  const isFavorited = isPersonal(data) ? data.isFavorited : false;

  // Get the appropriate icon
  const getIcon = () => {
    if (isTemplate(data)) {
      const Icon = categoryIcons[data.category] || categoryIcons.other;
      return <Icon className="h-5 w-5" />;
    }
    return <FileText className="h-5 w-5" />;
  };

  // Handle card click for personal prompts
  const handleCardClick = (e: React.MouseEvent) => {
    if (variant === "personal" && onPromptClick) {
      // Prevent navigation if clicking on buttons
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[role="button"]')) {
        e.preventDefault();
        return;
      }
      onPromptClick(data.id);
    }
  };

  // Handle like for shared prompts
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

  // Handle copy for shared prompts
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

  // Card wrapper (Link for personal, div for others)
  const CardWrapper = ({ children }: { children: React.ReactNode }) => {
    if (variant === "personal") {
      return (
        <Link
          href={`/prompts/${data.id}`}
          onClick={handleCardClick}
          className="block"
        >
          {children}
        </Link>
      );
    }
    return <>{children}</>;
  };

  return (
    <CardWrapper>
      <Card
        className={cn(
          dellCard('interactive'),
          "bg-card/50 dark:bg-card/30",
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
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg line-clamp-1">{title}</CardTitle>
                
                {/* Tags for personal and shared prompts */}
                {(variant === "personal" || variant === "shared") && tags && tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Hash className="h-3 w-3 text-muted-foreground" />
                    {tags.slice(0, 2).map((tag) => (
                      <Badge key={tag.id} variant="secondary" className="text-xs">
                        {tag.name}
                      </Badge>
                    ))}
                    {tags.length > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Category badge for templates */}
                {isTemplate(data) && (
                  <Badge variant="secondary" className="mt-1 capitalize">
                    {data.category}
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Action buttons in header */}
            <div className="flex items-center gap-2">
              {/* Pin button for personal prompts */}
              {variant === "personal" && isPersonal(data) && isPinned && (
                <Badge variant="secondary" className="gap-1">
                  <Pin className="h-3 w-3" />
                  Pinned
                </Badge>
              )}
              
              {variant === "personal" && isPersonal(data) && (
                <PinButton
                  promptId={data.id}
                  isPinned={!!isPinned}
                  size="sm"
                />
              )}
              
              {/* Like and Copy buttons for shared prompts */}
              {variant === "shared" && isShared(data) && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLike}
                    disabled={isLiking}
                    className={cn(
                      "h-8 px-2",
                      data.isLiked && "text-red-500"
                    )}
                  >
                    <Heart className={cn("h-4 w-4", data.isLiked && "fill-current")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    disabled={isCopying}
                    className="h-8 px-2"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </>
              )}
              
              {/* Favorite button for personal prompts */}
              {variant === "personal" && showFavoriteButton && isPersonal(data) && (
                <FavoriteButton
                  promptId={data.id}
                  isFavorited={!!isFavorited}
                  size="sm"
                />
              )}
            </div>
          </div>
          
          {/* Author section for shared prompts */}
          {variant === "shared" && showAuthor && isShared(data) && (
            <div className="flex items-center gap-2 mt-3">
              <Avatar
                user={data.author}
                size="sm"
              />
              <span className="text-sm text-muted-foreground">
                {data.author.name || data.author.username || 'Anonymous'}
              </span>
            </div>
          )}
          
          {/* Rating for templates */}
          {isTemplate(data) && data.rating && (
            <div className="flex items-center gap-1 mt-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-medium">{data.rating.toFixed(1)}</span>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Description */}
          {data.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {data.description}
            </p>
          )}
          
          {/* Variables for templates */}
          {isTemplate(data) && data.variables && data.variables.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Variables:</p>
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
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Example:</p>
              <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded line-clamp-2">
                {data.example}
              </div>
            </div>
          )}
          
          {/* Stats section */}
          <div className="flex items-center justify-between">
            {/* Personal prompt stats */}
            {variant === "personal" && isPersonal(data) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {data._count?.favorites !== undefined && (
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    <span>{data._count.favorites}</span>
                  </div>
                )}
                {data._count?.versions !== undefined && data._count.versions > 1 && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{data._count.versions} versions</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {data.lastUsedAt
                      ? `Used ${formatDistanceToNow(new Date(data.lastUsedAt), { addSuffix: true })}`
                      : formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            )}
            
            {/* Template stats */}
            {variant === "template" && isTemplate(data) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Copy className="h-3 w-3" />
                  <span>{data.usageCount || 0} uses</span>
                </div>
              </div>
            )}
            
            {/* Shared prompt stats */}
            {variant === "shared" && isShared(data) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{data.viewCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  <span>{data.likeCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  <span>{data.commentCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Copy className="h-3 w-3" />
                  <span>{data.copyCount}</span>
                </div>
              </div>
            )}
            
            {/* Action button */}
            {variant === "personal" && (
              <Button
                variant="ghost"
                size="sm"
                className="group-hover:bg-primary group-hover:text-primary-foreground"
              >
                Open
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            
            {variant === "template" && isTemplate(data) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUseTemplate?.(data);
                }}
                className="group-hover:bg-primary group-hover:text-primary-foreground"
              >
                Use Template
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
            
            {variant === "shared" && (
              <Link href={`/shared-prompts/${data.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="group-hover:bg-primary group-hover:text-primary-foreground"
                >
                  View
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
          
          {/* Bottom timestamp line */}
          {variant !== "personal" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              {isTemplate(data) && data.author && (
                <span>by {data.author.username || 'Unknown'}</span>
              )}
              {isShared(data) && data.publishedAt && (
                <span>
                  Published {formatDistanceToNow(new Date(data.publishedAt), { addSuffix: true })}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </CardWrapper>
  );
}