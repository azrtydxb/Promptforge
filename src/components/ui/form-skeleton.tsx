import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

interface FormSkeletonProps {
  fields?: number;
  showButton?: boolean;
  className?: string;
}

/**
 * Generic form skeleton loader
 * Shows loading state for: field labels, input fields, and optional submit button
 */
export function FormSkeleton({
  fields = 3,
  showButton = true,
  className
}: FormSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          {/* Label */}
          <Skeleton className="h-4 w-24" />
          {/* Input field */}
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      {showButton && (
        <div className="flex justify-end pt-2">
          {/* Submit button */}
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      )}
    </div>
  );
}

interface FormFieldSkeletonProps {
  className?: string;
}

/**
 * Single form field skeleton
 * Useful for composing custom form skeletons
 */
export function FormFieldSkeleton({ className }: FormFieldSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

interface FormTextareaSkeletonProps {
  className?: string;
}

/**
 * Textarea field skeleton
 * Shows a taller input area for text content
 */
export function FormTextareaSkeleton({ className }: FormTextareaSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-32 w-full rounded-md" />
    </div>
  );
}
