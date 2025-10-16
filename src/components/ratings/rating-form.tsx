'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StarRating } from './star-rating';
import { Loader2, Trash2 } from 'lucide-react';
import { ratePrompt, deleteRating } from '@/app/actions/template-rating.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface RatingFormProps {
  sharedPromptId: string;
  existingRating?: {
    id: string;
    rating: number;
    review: string | null;
  } | null;
  onSuccess?: () => void;
}

export function RatingForm({
  sharedPromptId,
  existingRating,
  onSuccess,
}: RatingFormProps) {
  const router = useRouter();
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [review, setReview] = useState(existingRating?.review || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await ratePrompt(sharedPromptId, {
        rating,
        review: review.trim() || undefined,
      });

      if (result.success) {
        toast.success(
          existingRating ? 'Rating updated successfully' : 'Rating submitted successfully'
        );
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(result.error || 'Failed to submit rating');
      }
    } catch {
      toast.error('An error occurred while submitting rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your rating?')) {
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteRating(sharedPromptId);

      if (result.success) {
        toast.success('Rating deleted successfully');
        setRating(0);
        setReview('');
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(result.error || 'Failed to delete rating');
      }
    } catch {
      toast.error('An error occurred while deleting rating');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {existingRating ? 'Update Your Rating' : 'Rate This Prompt'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Your Rating</Label>
            <StarRating
              rating={rating}
              onRatingChange={setRating}
              size="lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="review">Review (Optional)</Label>
            <Textarea
              id="review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your thoughts about this prompt..."
              rows={4}
              maxLength={1000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {review.length}/1000 characters
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : existingRating ? (
                'Update Rating'
              ) : (
                'Submit Rating'
              )}
            </Button>
            {existingRating && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-destructive hover:bg-destructive/10"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
