'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Star } from 'lucide-react';
import { RatingDisplay } from './star-rating';

interface RatingStatsProps {
  stats: {
    average: number;
    total: number;
    distribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
}

export function RatingStats({ stats }: RatingStatsProps) {
  const { average, total, distribution } = stats;

  if (total === 0) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12">
          <div className="text-center text-muted-foreground">
            <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No ratings yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rating Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Average Rating */}
        <div className="text-center">
          <div className="text-5xl font-bold mb-2">{average.toFixed(1)}</div>
          <RatingDisplay
            average={average}
            total={total}
            size="md"
            showAverage={false}
            className="justify-center"
          />
        </div>

        {/* Rating Distribution */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = distribution[stars as keyof typeof distribution];
            const percentage = total > 0 ? (count / total) * 100 : 0;

            return (
              <div key={stars} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-16">
                  <span className="text-sm font-medium">{stars}</span>
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </div>
                <Progress value={percentage} className="flex-1" />
                <span className="text-sm text-muted-foreground w-12 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
