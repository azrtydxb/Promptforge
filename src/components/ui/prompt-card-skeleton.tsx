import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";
import { cn } from "@/lib/utils";

interface PromptCardSkeletonProps {
  count?: number;
  className?: string;
}

/**
 * Skeleton loader that matches the PromptCard component layout
 * Shows loading state for: icon, title, tags, description, stats, and timestamp
 */
export function PromptCardSkeleton({ count = 1, className }: PromptCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card
          key={i}
          className={cn(
            "bg-card",
            className
          )}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Title */}
                  <Skeleton className="h-5 w-48" />
                  {/* Tags */}
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-3 w-3 rounded" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-3 w-6" />
                  </div>
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex items-center gap-1">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Description */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-8 w-20 rounded" />
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Skeleton className="h-3 w-3 rounded" />
              <Skeleton className="h-3 w-32" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
