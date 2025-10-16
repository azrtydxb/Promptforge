'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Check, Lock } from 'lucide-react';

interface BadgeProgress {
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  progress?: number | Record<string, number>;
  requirement?: number | Record<string, number>;
  manual?: boolean;
}

interface BadgeProgressProps {
  progress: Record<string, BadgeProgress>;
}

export function BadgeProgressTracker({ progress }: BadgeProgressProps) {
  const badges = Object.entries(progress);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {badges.map(([type, badge]) => (
        <BadgeProgressCard key={type} badge={badge} />
      ))}
    </div>
  );
}

function BadgeProgressCard({
  badge,
}: {
  badge: BadgeProgress;
}) {
  const getProgressPercentage = () => {
    if (badge.earned || badge.manual) return 100;

    if (typeof badge.progress === 'number' && typeof badge.requirement === 'number') {
      return Math.min((badge.progress / badge.requirement) * 100, 100);
    }

    return 0;
  };

  const getProgressText = () => {
    if (badge.earned) return 'Earned!';
    if (badge.manual) return 'Awarded by admin';

    if (typeof badge.progress === 'number' && typeof badge.requirement === 'number') {
      return `${badge.progress} / ${badge.requirement}`;
    }

    if (typeof badge.progress === 'object' && typeof badge.requirement === 'object') {
      const progressObj = badge.progress as Record<string, number>;
      const requirementObj = badge.requirement as Record<string, number>;

      return Object.keys(requirementObj)
        .map((key) => {
          const label = key.charAt(0).toUpperCase() + key.slice(1);
          return `${label}: ${progressObj[key]} / ${requirementObj[key]}`;
        })
        .join(', ');
    }

    return '';
  };

  const percentage = getProgressPercentage();

  return (
    <Card className={badge.earned ? 'border-green-500' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{badge.icon}</span>
            <div>
              <CardTitle className="text-base">{badge.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {badge.description}
              </p>
            </div>
          </div>
          {badge.earned ? (
            <Badge className="bg-green-500 hover:bg-green-600">
              <Check className="w-3 h-3 mr-1" />
              Earned
            </Badge>
          ) : badge.manual ? (
            <Badge variant="outline">
              <Lock className="w-3 h-3 mr-1" />
              Manual
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {!badge.manual && (
          <div className="space-y-2">
            <Progress value={percentage} className="h-2" />
            <p className="text-xs text-muted-foreground">{getProgressText()}</p>
          </div>
        )}
        {badge.manual && !badge.earned && (
          <p className="text-xs text-muted-foreground">
            This badge is awarded by administrators for special contributions
          </p>
        )}
      </CardContent>
    </Card>
  );
}
