import { Skeleton } from "./skeleton";
import { Card } from "./card";
import { cn } from "@/lib/utils";

interface ListSkeletonProps {
  items?: number;
  variant?: "card" | "list" | "grid";
  className?: string;
}

/**
 * Generic list skeleton loader with multiple layout variants
 * - card: Card-based list items with avatar and content
 * - list: Simple list items with icon and text
 * - grid: Grid layout for card items
 */
export function ListSkeleton({
  items = 5,
  variant = "card",
  className
}: ListSkeletonProps) {
  if (variant === "grid") {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
        {Array.from({ length: items }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="space-y-3">
              <Skeleton className="h-32 w-full rounded-md" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-8 w-20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Default: card variant
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center gap-4">
            {/* Avatar/Icon */}
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="space-y-2 flex-1">
              {/* Title */}
              <Skeleton className="h-4 w-1/3" />
              {/* Description */}
              <Skeleton className="h-4 w-full" />
            </div>
            {/* Action button */}
            <Skeleton className="h-8 w-8 rounded flex-shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
}

interface ListItemSkeletonProps {
  showAvatar?: boolean;
  showAction?: boolean;
  className?: string;
}

/**
 * Single list item skeleton
 * Useful for composing custom list skeletons
 */
export function ListItemSkeleton({
  showAvatar = true,
  showAction = true,
  className
}: ListItemSkeletonProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      {showAvatar && <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />}
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
      </div>
      {showAction && <Skeleton className="h-8 w-8 rounded flex-shrink-0" />}
    </div>
  );
}
