/**
 * Skeleton Loading Components
 *
 * Reusable skeleton loaders for common UI patterns.
 * All components use the base Skeleton component and support light/dark mode.
 */

// Base skeleton
export { Skeleton } from "./skeleton";

// Prompt-specific skeletons
export { PromptCardSkeleton } from "./prompt-card-skeleton";

// Form skeletons
export {
  FormSkeleton,
  FormFieldSkeleton,
  FormTextareaSkeleton
} from "./form-skeleton";

// List skeletons
export {
  ListSkeleton,
  ListItemSkeleton
} from "./list-skeleton";

// Table skeletons
export {
  TableSkeleton,
  CompactTableSkeleton,
  TableRowSkeleton
} from "./table-skeleton";

// Legacy skeletons (from skeleton.tsx - kept for backward compatibility)
export {
  SkeletonCard,
  SkeletonList,
  SkeletonTable,
  SkeletonForm,
  SkeletonPromptCard
} from "./skeleton";
