'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
  className?: string;
}

export function StarRating({
  rating,
  onRatingChange,
  readonly = false,
  size = 'md',
  showCount = false,
  count,
  className,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const displayRating = hoverRating || rating;

  const handleClick = (value: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((value) => {
          const isFilled = value <= displayRating;
          const isHalfFilled = value - 0.5 <= displayRating && value > displayRating;

          return (
            <button
              key={value}
              type="button"
              onClick={() => handleClick(value)}
              onMouseEnter={() => !readonly && setHoverRating(value)}
              onMouseLeave={() => !readonly && setHoverRating(0)}
              disabled={readonly}
              className={cn(
                'transition-colors',
                !readonly && 'cursor-pointer hover:scale-110',
                readonly && 'cursor-default'
              )}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : isHalfFilled
                    ? 'fill-yellow-400/50 text-yellow-400'
                    : 'fill-none text-gray-300'
                )}
              />
            </button>
          );
        })}
      </div>
      {showCount && count !== undefined && (
        <span className="text-sm text-muted-foreground ml-1">
          ({count})
        </span>
      )}
    </div>
  );
}

interface RatingDisplayProps {
  average: number;
  total: number;
  size?: 'sm' | 'md' | 'lg';
  showAverage?: boolean;
  className?: string;
}

export function RatingDisplay({
  average,
  total,
  size = 'md',
  showAverage = true,
  className,
}: RatingDisplayProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <StarRating rating={average} readonly size={size} />
      {showAverage && (
        <span className="text-sm font-medium">
          {average.toFixed(1)}
        </span>
      )}
      <span className="text-sm text-muted-foreground">
        ({total} {total === 1 ? 'rating' : 'ratings'})
      </span>
    </div>
  );
}
