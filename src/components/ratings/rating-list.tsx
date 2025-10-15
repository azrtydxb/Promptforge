'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AvatarRoot as Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from './star-rating';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare } from 'lucide-react';

interface Rating {
  id: string;
  rating: number;
  review: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  };
}

interface RatingListProps {
  ratings: Rating[];
  emptyMessage?: string;
}

export function RatingList({
  ratings,
  emptyMessage = 'No ratings yet. Be the first to rate this prompt!',
}: RatingListProps) {
  if (ratings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {ratings.map((rating) => (
        <Card key={rating.id}>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {rating.user.image && (
                      <AvatarImage
                        src={rating.user.image}
                        alt={rating.user.name || 'User'}
                      />
                    )}
                    <AvatarFallback>
                      {(rating.user.name || rating.user.username || 'U')[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {rating.user.name || rating.user.username || 'Unknown User'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(rating.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                <StarRating rating={rating.rating} readonly size="sm" />
              </div>

              {rating.review && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {rating.review}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
