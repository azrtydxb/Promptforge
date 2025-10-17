'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from '@/components/ui/avatar';
import {
  Heart,
  MessageCircle,
  Eye,
  Copy,
  Calendar,
  MoreHorizontal,
  Hash
} from 'lucide-react';
import { stickyNoteCard, dellIconButton } from '@/lib/styles';
import { togglePromptLike } from '@/app/actions/likes-comments.actions';
import { copySharedPrompt } from '@/app/actions/shared-prompts.actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  variant?: 'sticky' | 'card';
  className?: string;
}

export function SharedPromptCardUnified({
  sharedPrompt,
  onLikeToggle,
  onCopy,
  showAuthor = true,
  variant = 'sticky',
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

  const getDescriptionSnippet = (description: string | null | undefined) => {
    if (!description) return "Click to view this prompt...";
    const maxLength = variant === 'sticky' ? 300 : 150;
    return description.length > maxLength
      ? description.substring(0, maxLength) + "..."
      : description;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return variant === 'sticky'
      ? new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric'
        }).format(new Date(date))
      : formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  if (variant === 'card') {
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
            <Link
              href={`/shared-prompts/${sharedPrompt.id}`}
              className="flex-1 min-w-0"
            >
              <h3 className="text-lg font-semibold line-clamp-1 hover:text-[hsl(var(--primary))] transition-colors">
                {sharedPrompt.title}
              </h3>
              {sharedPrompt.prompt.tags && sharedPrompt.prompt.tags.length > 0 && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
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
            </Link>
            <div className="flex items-center gap-2 ml-2">
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
                    {formatDate(sharedPrompt.publishedAt)}
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
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sticky note variant
  const colors: Array<'yellow' | 'blue' | 'green' | 'pink' | 'orange'> = ['yellow', 'blue', 'green', 'pink', 'orange'];
  const colorIndex = sharedPrompt.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const stickyColor = colors[colorIndex];

  return (
    <div className={cn("mb-6", className)}>
      <div className={stickyNoteCard(stickyColor, "group relative cursor-pointer flex flex-col")}>
        <div className="flex justify-between items-start mb-3 flex-shrink-0">
          <Link
            href={`/shared-prompts/${sharedPrompt.id}`}
            className="flex-grow text-xl font-semibold text-gray-800 hover:text-[hsl(var(--primary))] transition-colors line-clamp-4 mr-2"
          >
            {sharedPrompt.title}
          </Link>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`${dellIconButton('overlay', 'sm')} ${
                isLiked
                  ? 'text-red-500 bg-white shadow-md'
                  : ''
              } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={`${likeCount} likes`}
            >
              <Heart className={`h-3 w-3 ${isLiked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleCopy}
              disabled={isCopying}
              className={dellIconButton('overlay', 'sm')}
              title="Copy to My Library"
            >
              <Copy className="h-3 w-3" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white z-50">
                <DropdownMenuItem onClick={handleCopy} disabled={isCopying}>
                  <Copy className="w-4 h-4 mr-2" />
                  {isCopying ? 'Copying...' : 'Copy to My Library'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-grow mb-3 overflow-hidden">
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-8">
            {getDescriptionSnippet(sharedPrompt.description)}
          </p>
        </div>

        <div className="flex-shrink-0">
          {showAuthor && (
            <div className="flex items-center gap-2 mb-2">
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
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 truncate">
                  {sharedPrompt.author.name || sharedPrompt.author.username}
                </p>
                {sharedPrompt.publishedAt && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {formatDate(sharedPrompt.publishedAt)}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-1 relative">
            {sharedPrompt.prompt.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="inline-block px-2 py-1 text-xs bg-gray-200 rounded-full text-gray-700 font-medium"
                title={tag.name}
              >
                {tag.name}
              </span>
            ))}
            {sharedPrompt.prompt.tags.length > 2 && (
              <span className="inline-block px-2 py-1 text-xs bg-gray-300 rounded-full text-gray-600">
                +{sharedPrompt.prompt.tags.length - 2}
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {sharedPrompt.viewCount}
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {sharedPrompt.commentCount}
              </div>
            </div>
            {likeCount > 0 && (
              <div className="text-xs text-gray-500 font-medium">
                {likeCount} {likeCount === 1 ? 'like' : 'likes'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
