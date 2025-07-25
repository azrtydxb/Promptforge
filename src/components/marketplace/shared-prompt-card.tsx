'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { 
  Heart, 
  MessageCircle, 
  Eye, 
  Copy, 
  Calendar,
  MoreHorizontal
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

export function SharedPromptCard({ 
  sharedPrompt, 
  onLikeToggle, 
  onCopy,
  showAuthor = true 
}: SharedPromptCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isLiked, setIsLiked] = useState(sharedPrompt.isLiked || false);
  const [likeCount, setLikeCount] = useState(sharedPrompt.likeCount);

  // Generate consistent color based on prompt ID (same as existing prompts)
  const colors: Array<'yellow' | 'blue' | 'green' | 'pink' | 'orange'> = ['yellow', 'blue', 'green', 'pink', 'orange'];
  const colorIndex = sharedPrompt.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const stickyColor = colors[colorIndex];

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
    const maxLength = 300;
    return description.length > maxLength
      ? description.substring(0, maxLength) + "..."
      : description;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  return (
    <div className="mb-6">
      <div className={stickyNoteCard(stickyColor, "group relative cursor-pointer flex flex-col")}>
        {/* Sticky note header with title, like/share buttons, and menu */}
        <div className="flex justify-between items-start mb-3 flex-shrink-0">
          <Link
            href={`/shared-prompts/${sharedPrompt.id}`}
            className="flex-grow text-xl font-semibold text-gray-800 hover:text-[hsl(var(--primary))] transition-colors line-clamp-4 mr-2"
          >
            {sharedPrompt.title}
          </Link>
          
          {/* Right side buttons: Like, Share, Menu */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Like button */}
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

            {/* Copy button */}
            <button
              onClick={handleCopy}
              disabled={isCopying}
              className={dellIconButton('overlay', 'sm')}
              title="Copy to My Library"
            >
              <Copy className="h-3 w-3" />
            </button>

            {/* Menu button */}
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

        {/* Description snippet in the middle */}
        <div className="flex-grow mb-3 overflow-hidden">
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-8">
            {getDescriptionSnippet(sharedPrompt.description)}
          </p>
        </div>

        {/* Bottom section with tags and author info */}
        <div className="flex-shrink-0">
          {/* Author info */}
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

          {/* Tags at the bottom with more space */}
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

          {/* Stats display at bottom */}
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
            {/* Like count display */}
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