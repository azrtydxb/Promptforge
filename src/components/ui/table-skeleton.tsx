import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

/**
 * Table skeleton loader
 * Shows loading state for table headers and data rows
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className
}: TableSkeletonProps) {
  return (
    <div className={cn("w-full border rounded-lg overflow-hidden", className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex gap-4 p-4 border-b bg-muted/50">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      )}
      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 p-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface CompactTableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

/**
 * Compact table skeleton with smaller padding
 * Suitable for data-dense tables
 */
export function CompactTableSkeleton({
  rows = 10,
  columns = 5,
  className
}: CompactTableSkeletonProps) {
  return (
    <div className={cn("w-full border rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="flex gap-3 px-3 py-2 border-b bg-muted/50">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-3 px-3 py-2">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface TableRowSkeletonProps {
  columns?: number;
  className?: string;
}

/**
 * Single table row skeleton
 * Useful for incremental loading patterns
 */
export function TableRowSkeleton({ columns = 4, className }: TableRowSkeletonProps) {
  return (
    <div className={cn("flex gap-4 p-4 border-b", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}
