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
  Folder,
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

export function UnifiedPromptCardV3({
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
    return <>{children}</>;
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
        <CardHeader className="space-y-0 pb-4">
          {/* Row 1: Icon, Title, and Action Buttons */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "p-2 rounded-lg flex-shrink-0",
                "bg-muted",
                "group-hover:bg-primary/10",
                "transition-colors"
              )}
            >
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg font-semibold line-clamp-1 flex-1">
                  {title}
                </CardTitle>
                
                {/* Action buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Personal: Pin & Favorite */}
                  {variant === "personal" && isPersonal(data) && (
                    <>
                      <PinButton
                        promptId={data.id}
                        isPinned={!!isPinned}
                        size="sm"
                      />
                      {showFavoriteButton && (
                        <FavoriteButton
                          promptId={data.id}
                          isFavorited={!!isFavorited}
                          size="sm"
                        />
                      )}
                    </>
                  )}
                  
                  {/* Shared: Like & Copy */}
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
                </div>
              </div>
              
              {/* Row 2: Metadata (Category/Tags/Author) */}
              <div className="flex items-center gap-2 mt-2 text-sm">
                {/* Templates: Category & Rating */}
                {isTemplate(data) && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      {data.category}
                    </Badge>
                    {data.rating && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-muted-foreground">{data.rating.toFixed(1)}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
                
                {/* Personal/Shared: Tags */}
                {(variant === "personal" || variant === "shared") && tags && tags.length > 0 && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Hash className="h-3.5 w-3.5" />
                    {tags.slice(0, 2).map((tag) => (
                      <span key={tag.id} className="text-xs">{tag.name}</span>
                    ))}
                    {tags.length > 2 && <span className="text-xs">+{tags.length - 2}</span>}
                  </div>
                )}
                
                {/* Shared: Author */}
                {variant === "shared" && showAuthor && isShared(data) && (
                  <>
                    {tags && tags.length > 0 && <span className="text-muted-foreground">•</span>}
                    <span className="text-xs text-muted-foreground">
                      {data.author.name || data.author.username || 'Anonymous'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Pinned Badge */}
          {isPinned && (
            <Badge variant="secondary" className="gap-1 mt-2 w-fit text-xs">
              <Pin className="h-3 w-3" />
              Pinned
            </Badge>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col justify-between space-y-4 pb-4">
          {/* Description */}
          {data.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {data.description}
            </p>
          )}
          
          {/* Template Variables */}
          {isTemplate(data) && data.variables && data.variables.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {data.variables.slice(0, 3).map((variable, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {`{{${variable}}}`}
                </Badge>
              ))}
              {data.variables.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{data.variables.length - 3} more
                </Badge>
              )}
            </div>
          )}
          
          {/* Bottom section */}
          <div className="flex items-center justify-between pt-3 border-t mt-auto">
            {/* Stats */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {/* Personal: Time info */}
              {variant === "personal" && isPersonal(data) && (
                <>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {data.lastUsedAt
                        ? `Used ${formatDistanceToNow(new Date(data.lastUsedAt), { addSuffix: true })}`
                        : formatDistanceToNow(new Date(data.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {data._count?.versions && data._count.versions > 1 && (
                    <>
                      <span>•</span>
                      <span>{data._count.versions} versions</span>
                    </>
                  )}
                </>
              )}
              
              {/* Template: Usage count */}
              {variant === "template" && isTemplate(data) && (
                <div className="flex items-center gap-1">
                  <Copy className="h-3.5 w-3.5" />
                  <span>{data.usageCount || 0} uses</span>
                </div>
              )}
              
              {/* Shared: Engagement metrics */}
              {variant === "shared" && isShared(data) && (
                <>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    <span>{data.viewCount}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    <span>{data.likeCount}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>{data.commentCount}</span>
                  </div>
                </>
              )}
            </div>
            
            {/* Action button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={(e) => {
                if (variant === "template" && isTemplate(data)) {
                  e.preventDefault();
                  e.stopPropagation();
                  onUseTemplate?.(data);
                }
              }}
            >
              {variant === "personal" && "Open"}
              {variant === "template" && "Use Template"}
              {variant === "shared" && "View"}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </CardWrapper>
  );
}