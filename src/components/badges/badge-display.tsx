'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface UserBadge {
  id: string;
  type: string;
  title: string;
  description: string | null;
  earnedAt: Date;
}

interface BadgeDisplayProps {
  badge: UserBadge;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const BADGE_ICONS: Record<string, string> = {
  CREATOR: '✨',
  POPULAR: '🌟',
  HELPFUL: '💝',
  VERIFIED: '✓',
  MODERATOR: '🛡️',
  EARLY_ADOPTER: '🚀',
};

const BADGE_COLORS: Record<string, string> = {
  CREATOR: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  POPULAR: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  HELPFUL: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  VERIFIED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  MODERATOR: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  EARLY_ADOPTER: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
};

export function BadgeDisplay({ badge, size = 'md', showLabel = true }: BadgeDisplayProps) {
  const icon = BADGE_ICONS[badge.type] || '🏆';
  const colorClass = BADGE_COLORS[badge.type] || 'bg-gray-100 text-gray-800';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={`${colorClass} ${sizeClasses[size]} cursor-help flex items-center gap-1`}
          >
            <span>{icon}</span>
            {showLabel && <span>{badge.title}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{badge.title}</p>
            {badge.description && (
              <p className="text-sm text-muted-foreground">{badge.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Earned {formatDistanceToNow(new Date(badge.earnedAt), { addSuffix: true })}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface BadgeListProps {
  badges: UserBadge[];
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  maxDisplay?: number;
  className?: string;
}

export function BadgeList({
  badges,
  size = 'md',
  showLabel = true,
  maxDisplay,
  className,
}: BadgeListProps) {
  const displayBadges = maxDisplay ? badges.slice(0, maxDisplay) : badges;
  const remaining = maxDisplay && badges.length > maxDisplay ? badges.length - maxDisplay : 0;

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className || ''}`}>
      {displayBadges.map((badge) => (
        <BadgeDisplay
          key={badge.id}
          badge={badge}
          size={size}
          showLabel={showLabel}
        />
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className={sizeClasses[size]}>
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};
