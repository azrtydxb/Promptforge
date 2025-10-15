'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Award, TrendingUp } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReputationDisplayProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ReputationDisplay({
  score,
  showLabel = true,
  size = 'md',
  className,
}: ReputationDisplayProps) {
  const getLevel = (score: number) => {
    if (score >= 10000) return { name: 'Legend', color: 'text-purple-500', icon: '👑' };
    if (score >= 5000) return { name: 'Master', color: 'text-orange-500', icon: '⭐' };
    if (score >= 2000) return { name: 'Expert', color: 'text-blue-500', icon: '💎' };
    if (score >= 1000) return { name: 'Advanced', color: 'text-green-500', icon: '🔥' };
    if (score >= 500) return { name: 'Intermediate', color: 'text-yellow-500', icon: '📈' };
    if (score >= 100) return { name: 'Novice', color: 'text-gray-500', icon: '🌱' };
    return { name: 'Beginner', color: 'text-gray-400', icon: '✨' };
  };

  const level = getLevel(score);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-2 ${className || ''}`}>
            <Award className={`${level.color} ${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}`} />
            <div className={sizeClasses[size]}>
              <span className="font-bold">{score.toLocaleString()}</span>
              {showLabel && (
                <span className={`ml-2 ${level.color} font-medium`}>
                  {level.icon} {level.name}
                </span>
              )}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            <p className="font-medium">Reputation Score: {score.toLocaleString()}</p>
            <p className="text-sm">Level: {level.icon} {level.name}</p>
            <div className="text-xs text-muted-foreground space-y-1 mt-2">
              <p>Earn reputation by:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Sharing quality prompts (10 pts)</li>
                <li>Receiving likes (5 pts each)</li>
                <li>Getting copies (15 pts each)</li>
                <li>High ratings (up to 100 pts)</li>
                <li>Gaining followers (2 pts each)</li>
                <li>Earning badges (50 pts each)</li>
              </ul>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ReputationCardProps {
  score: number;
  badgeCount: number;
  className?: string;
}

export function ReputationCard({ score, badgeCount, className }: ReputationCardProps) {
  const level = getLevel(score);

  function getLevel(score: number) {
    if (score >= 10000) return { name: 'Legend', color: 'text-purple-500', icon: '👑', nextLevel: null, nextScore: null };
    if (score >= 5000) return { name: 'Master', color: 'text-orange-500', icon: '⭐', nextLevel: 'Legend', nextScore: 10000 };
    if (score >= 2000) return { name: 'Expert', color: 'text-blue-500', icon: '💎', nextLevel: 'Master', nextScore: 5000 };
    if (score >= 1000) return { name: 'Advanced', color: 'text-green-500', icon: '🔥', nextLevel: 'Expert', nextScore: 2000 };
    if (score >= 500) return { name: 'Intermediate', color: 'text-yellow-500', icon: '📈', nextLevel: 'Advanced', nextScore: 1000 };
    if (score >= 100) return { name: 'Novice', color: 'text-gray-500', icon: '🌱', nextLevel: 'Intermediate', nextScore: 500 };
    return { name: 'Beginner', color: 'text-gray-400', icon: '✨', nextLevel: 'Novice', nextScore: 100 };
  }

  const progressToNext = level.nextScore
    ? ((score - (level.nextScore - (level.nextScore === 10000 ? 5000 : level.nextScore === 5000 ? 3000 : level.nextScore === 2000 ? 1000 : level.nextScore === 1000 ? 500 : level.nextScore === 500 ? 400 : 100))) /
        (level.nextScore - (level.nextScore === 10000 ? 5000 : level.nextScore === 5000 ? 3000 : level.nextScore === 2000 ? 1000 : level.nextScore === 1000 ? 500 : level.nextScore === 500 ? 400 : 100))) *
      100
    : 100;

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Reputation</p>
              <p className="text-3xl font-bold">{score.toLocaleString()}</p>
            </div>
            <div className={`text-5xl ${level.color}`}>{level.icon}</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-medium ${level.color}`}>{level.name}</span>
              {level.nextLevel && (
                <span className="text-sm text-muted-foreground">
                  Next: {level.nextLevel}
                </span>
              )}
            </div>
            {level.nextScore && (
              <div className="space-y-1">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500`}
                    style={{ width: `${Math.min(progressToNext, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {level.nextScore - score} points to next level
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Badges</p>
                <p className="font-medium">{badgeCount}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
