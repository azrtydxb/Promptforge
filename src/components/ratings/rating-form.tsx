'use client';

import React, { useState } from 'react';
import { LoadingButton } from '@/components/ui/loading-button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StarRating } from './star-rating';
import { Trash2 } from 'lucide-react';
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
  const [optimisticState, setOptimisticState] = useState<{
    rating: number;
    review: string;
    isSubmitted: boolean;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);

    // Optimistic update
    setOptimisticState({
      rating,
      review: review.trim(),
      isSubmitted: true
    });

    try {
      const result = await ratePrompt(sharedPromptId, {
        rating,
        review: review.trim() || undefined,
      });

      if (result.success) {
        toast.success(
          existingRating ? 'Rating updated successfully' : 'Rating submitted successfully'
        );
        setOptimisticState(null); // Clear optimistic state on success
        router.refresh();
        onSuccess?.();
      } else {
        // Revert optimistic update on error
        setOptimisticState(null);
        toast.error(result.error || 'Failed to submit rating');
      }
    } catch {
      // Revert optimistic update on error
      setOptimisticState(null);
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
    <Card className={optimisticState?.isSubmitted ? 'opacity-75' : ''}>
      <CardHeader>
        <CardTitle>
          {existingRating ? 'Update Your Rating' : 'Rate This Prompt'}
        </CardTitle>
        {optimisticState?.isSubmitted && (
          <p className="text-sm text-muted-foreground">Submitting your rating...</p>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Your Rating</Label>
            <StarRating
              rating={optimisticState?.rating || rating}
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
            <LoadingButton
              type="submit"
              loading={isSubmitting}
              disabled={rating === 0}
              loadingText="Submitting..."
              className="flex-1"
            >
              {existingRating ? 'Update Rating' : 'Submit Rating'}
            </LoadingButton>
            {existingRating && (
              <LoadingButton
                type="button"
                variant="destructive"
                onClick={handleDelete}
                loading={isDeleting}
                className="px-3"
              >
                <Trash2 className="w-4 h-4" />
              </LoadingButton>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
