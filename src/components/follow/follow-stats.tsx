'use client';

import React from 'react';
import { Users, UserPlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FollowStatsProps {
  followers: number;
  following: number;
  className?: string;
}

export function FollowStats({ followers, following, className }: FollowStatsProps) {
  return (
    <div className={`flex gap-4 ${className || ''}`}>
      <Card className="flex-1">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{followers}</p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="flex-1">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{following}</p>
              <p className="text-sm text-muted-foreground">Following</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
