'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { getBadgeConfigs } from '@/app/actions/app-config.actions';

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

interface BadgeConfig {
  icon: string;
  color: string;
  darkColor?: string;
  description?: string;
}

// Fallback configuration in case database is unavailable
const FALLBACK_BADGE_CONFIG: Record<string, BadgeConfig> = {
  CREATOR: {
    icon: '✨',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  POPULAR: {
    icon: '🌟',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  HELPFUL: {
    icon: '💝',
    color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  },
  VERIFIED: {
    icon: '✓',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  },
  MODERATOR: {
    icon: '🛡️',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
  EARLY_ADOPTER: {
    icon: '🚀',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  },
  DEFAULT: {
    icon: '🏆',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  },
};

export function BadgeDisplay({ badge, size = 'md', showLabel = true }: BadgeDisplayProps) {
  const [badgeConfigs, setBadgeConfigs] = useState<Record<string, BadgeConfig>>(FALLBACK_BADGE_CONFIG);

  useEffect(() => {
    // Load badge configurations from database
    async function loadBadgeConfigs() {
      try {
        const configs = await getBadgeConfigs();
        if (Object.keys(configs).length > 0) {
          setBadgeConfigs(configs);
        }
      } catch (error) {
        console.error('Failed to load badge configs, using fallback:', error);
      }
    }

    loadBadgeConfigs();
  }, []);

  const config = badgeConfigs[badge.type] || badgeConfigs.DEFAULT || FALLBACK_BADGE_CONFIG.DEFAULT;
  const icon = config.icon;
  const colorClass = config.color;

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

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

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
