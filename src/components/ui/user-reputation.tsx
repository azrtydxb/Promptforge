'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  Award, 
  Heart, 
  Shield, 
  Zap,
  Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserBadge {
  type: 'CREATOR' | 'POPULAR' | 'HELPFUL' | 'VERIFIED' | 'MODERATOR' | 'EARLY_ADOPTER';
  title: string;
  description?: string;
  earnedAt: Date;
}

interface UserReputationProps {
  reputationScore: number;
  badges?: UserBadge[];
  showBadges?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const badgeConfig = {
  CREATOR: { icon: Award, color: 'bg-[hsl(var(--primary))]', label: 'Creator' },
  POPULAR: { icon: Star, color: 'bg-yellow-600', label: 'Popular' },
  HELPFUL: { icon: Heart, color: 'bg-green-600', label: 'Helpful' },
  VERIFIED: { icon: Shield, color: 'bg-[hsl(var(--primary))]', label: 'Verified' },
  MODERATOR: { icon: Crown, color: 'bg-purple-600', label: 'Moderator' },
  EARLY_ADOPTER: { icon: Zap, color: 'bg-orange-600', label: 'Early Adopter' }
};

export function UserReputation({ 
  reputationScore, 
  badges = [], 
  showBadges = true,
  size = 'md',
  className 
}: UserReputationProps) {
  const getReputationLevel = (score: number) => {
    if (score >= 1000) return { level: 'Expert', color: 'text-yellow-400' };
    if (score >= 500) return { level: 'Advanced', color: 'text-[hsl(var(--primary))]' };
    if (score >= 100) return { level: 'Contributor', color: 'text-green-400' };
    if (score >= 50) return { level: 'Member', color: 'text-gray-400' };
    return { level: 'Newcomer', color: 'text-gray-500' };
  };

  const reputation = getReputationLevel(reputationScore);
  const sizeConfig = {
    sm: {
      text: 'text-xs',
      badge: 'text-xs px-2 py-0.5',
      icon: 'w-3 h-3'
    },
    md: {
      text: 'text-sm',
      badge: 'text-xs px-2 py-1',
      icon: 'w-4 h-4'
    },
    lg: {
      text: 'text-base',
      badge: 'text-sm px-3 py-1',
      icon: 'w-5 h-5'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Reputation Score */}
      <div className="flex items-center gap-1">
        <Star className={cn("fill-yellow-400 text-yellow-400", config.icon)} />
        <span className={cn("font-medium text-white", config.text)}>
          {reputationScore}
        </span>
        <span className={cn(reputation.color, config.text)}>
          {reputation.level}
        </span>
      </div>

      {/* Badges */}
      {showBadges && badges.length > 0 && (
        <div className="flex items-center gap-1">
          {badges.slice(0, 3).map((badge) => {
            const BadgeIcon = badgeConfig[badge.type]?.icon || Award;
            const badgeColor = badgeConfig[badge.type]?.color || 'bg-gray-600';
            
            return (
              <div
                key={badge.type}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5",
                  badgeColor,
                  config.badge
                )}
                title={badge.description || badge.title}
              >
                <BadgeIcon className={config.icon} />
                {size !== 'sm' && (
                  <span className="text-white font-medium">
                    {badgeConfig[badge.type]?.label || badge.title}
                  </span>
                )}
              </div>
            );
          })}
          
          {badges.length > 3 && (
            <Badge variant="secondary" className={config.badge}>
              +{badges.length - 3}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

interface UserProfileReputationProps {
  user: {
    reputationScore: number;
    badges?: UserBadge[];
  };
  detailed?: boolean;
  className?: string;
}

export function UserProfileReputation({ 
  user, 
  detailed = false, 
  className 
}: UserProfileReputationProps) {
  if (detailed) {
    return (
      <div className={cn("space-y-4", className)}>
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Reputation</h3>
          <UserReputation 
            reputationScore={user.reputationScore} 
            badges={user.badges}
            size="lg"
          />
        </div>
        
        {user.badges && user.badges.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-white mb-3">Badges Earned</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {user.badges.map((badge) => {
                const BadgeIcon = badgeConfig[badge.type]?.icon || Award;
                const badgeColor = badgeConfig[badge.type]?.color || 'bg-gray-600';
                
                return (
                  <div
                    key={badge.type}
                    className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg border border-gray-700"
                  >
                    <div className={cn("p-2 rounded-full", badgeColor)}>
                      <BadgeIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{badge.title}</div>
                      {badge.description && (
                        <div className="text-sm text-gray-400">{badge.description}</div>
                      )}
                      <div className="text-xs text-gray-500">
                        Earned {new Date(badge.earnedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <UserReputation 
      reputationScore={user.reputationScore} 
      badges={user.badges}
      className={className}
    />
  );
}