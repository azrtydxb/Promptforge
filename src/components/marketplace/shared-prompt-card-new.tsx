'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from '@/components/ui/avatar';
import { 
  Heart, 
  MessageCircle, 
  Eye, 
  Copy, 
  FileText,
  ArrowRight,
  Hash,
} from 'lucide-react';
import { togglePromptLike } from '@/app/actions/likes-comments.actions';
import { copySharedPrompt } from '@/app/actions/shared-prompts.actions';
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface SharedPromptCardProps {
  sharedPrompt: {
    id: string;
    promptId: string;
    title: string;
    description?: string | null;
    content: string;
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
    prompt: {
      tags: Array<{
        id: string;
        name: string;
      }>;
    };
  };
  onLikeToggle?: (id: string, isLiked: boolean) => void;
  onCopy?: (id: string) => void;
  showAuthor?: boolean;
  className?: string;
}

export function SharedPromptCardNew({ 
  sharedPrompt, 
  onLikeToggle, 
  onCopy,
  showAuthor = true,
  className
}: SharedPromptCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isLiked, setIsLiked] = useState(sharedPrompt.isLiked || false);
  const [likeCount, setLikeCount] = useState(sharedPrompt.likeCount);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLiking) return;

    setIsLiking(true);
    
    // Optimistic update
    const newIsLiked = !isLiked;
    const newLikeCount = newIsLiked ? likeCount + 1 : likeCount - 1;
    setIsLiked(newIsLiked);
    setLikeCount(newLikeCount);

    try {
      const result = await togglePromptLike(sharedPrompt.promptId);
      if (result.success) {
        onLikeToggle?.(sharedPrompt.id, newIsLiked);
      } else {
        // Revert on error
        setIsLiked(isLiked);
        setLikeCount(likeCount);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert on error
      setIsLiked(isLiked);
      setLikeCount(likeCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCopying) return;

    setIsCopying(true);
    try {
      const result = await copySharedPrompt(sharedPrompt.id);
      if (result.success) {
        onCopy?.(sharedPrompt.id);
      }
    } catch (error) {
      console.error('Error copying prompt:', error);
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Card
      className={cn(
        "hover:shadow-md transition-all duration-200 cursor-pointer group",
        "bg-card",
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
                "group-hover:bg-[hsl(var(--primary))]/20",
                "transition-colors"
              )}
            >
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-1">{sharedPrompt.title}</CardTitle>
              {sharedPrompt.prompt.tags && sharedPrompt.prompt.tags.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Hash className="h-3 w-3 text-muted-foreground" />
                  {sharedPrompt.prompt.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-xs">
                      {tag.name}
                    </Badge>
                  ))}
                  {sharedPrompt.prompt.tags.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{sharedPrompt.prompt.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLike}
              disabled={isLiking}
              className={cn(
                "h-8 w-8 p-0",
                isLiked && "text-red-500"
              )}
            >
              <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              disabled={isCopying}
              className="h-8 w-8 p-0"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sharedPrompt.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {sharedPrompt.description}
          </p>
        )}

        {/* Author info */}
        {showAuthor && (
          <div className="flex items-center gap-2">
            <Avatar
              user={{
                id: sharedPrompt.author.id,
                username: sharedPrompt.author.username,
                name: sharedPrompt.author.name,
                avatarType: sharedPrompt.author.avatarType,
                profilePicture: sharedPrompt.author.profilePicture
              }}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {sharedPrompt.author.name || sharedPrompt.author.username}
              </p>
              {sharedPrompt.publishedAt && (
                <p className="text-xs text-muted-foreground">
                  Published {formatDistanceToNow(new Date(sharedPrompt.publishedAt))} ago
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{sharedPrompt.viewCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span>{likeCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>{sharedPrompt.commentCount}</span>
            </div>
            {sharedPrompt.copyCount > 0 && (
              <div className="flex items-center gap-1">
                <Copy className="h-3 w-3" />
                <span>{sharedPrompt.copyCount}</span>
              </div>
            )}
          </div>
          <Link
            href={`/shared-prompts/${sharedPrompt.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              size="sm"
              variant="ghost"
              className="group-hover:bg-primary group-hover:text-primary-foreground"
            >
              View
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}