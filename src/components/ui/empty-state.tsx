"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  FileX, 
  Search, 
  FolderX, 
  Tags,
  FileQuestion,
  ServerOff,
  AlertCircle,
  type LucideIcon 
} from "lucide-react";

// Predefined empty state types with appropriate icons
const emptyStateIcons = {
  noData: FileX,
  noResults: Search,
  noFolders: FolderX,
  noTags: Tags,
  notFound: FileQuestion,
  error: AlertCircle,
  offline: ServerOff,
} as const;

type EmptyStateType = keyof typeof emptyStateIcons;

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "primary" | "secondary" | "outline" | "ghost";
}

interface EmptyStateProps {
  type?: EmptyStateType;
  icon?: LucideIcon;
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  type = "noData",
  icon,
  title,
  description,
  actions,
  className,
  size = "md",
}: EmptyStateProps) {
  const Icon = icon || emptyStateIcons[type];
  
  const sizeClasses = {
    sm: {
      container: "py-8",
      icon: "h-12 w-12 mb-3",
      title: "text-base",
      description: "text-sm",
      button: "text-sm",
    },
    md: {
      container: "py-12",
      icon: "h-16 w-16 mb-4",
      title: "text-lg",
      description: "text-base",
      button: "text-base",
    },
    lg: {
      container: "py-16",
      icon: "h-20 w-20 mb-6",
      title: "text-xl",
      description: "text-lg",
      button: "text-base",
    },
  };

  const sizes = sizeClasses[size];

  // Map types to gradient colors
  const typeGradients = {
    noData: "from-blue-500 to-purple-600",
    noResults: "from-purple-500 to-pink-600",
    noFolders: "from-emerald-500 to-teal-600",
    noTags: "from-amber-500 to-orange-600",
    notFound: "from-rose-500 to-red-600",
    error: "from-red-500 to-orange-600",
    offline: "from-gray-500 to-slate-600",
  };

  const gradient = typeGradients[type];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizes.container,
        className
      )}
    >
      {/* Enhanced icon container with gradient and glow */}
      <div className="relative mb-6">
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-full opacity-20 blur-2xl",
          `bg-gradient-to-r ${gradient}`,
          "animate-in fade-in zoom-in duration-700"
        )} />

        {/* Icon container */}
        <div className={cn(
          "relative rounded-full p-5 shadow-lg",
          `bg-gradient-to-br ${gradient}`,
          "animate-in fade-in zoom-in duration-500",
          "hover:scale-110 transition-transform duration-300"
        )}>
          <Icon className={cn(
            sizes.icon,
            "text-white"
          )} />
        </div>
      </div>

      <h3 className={cn(
        "font-bold text-foreground mb-3",
        sizes.title,
        "animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100"
      )}>
        {title}
      </h3>

      {description && (
        <p className={cn(
          "text-muted-foreground max-w-md mb-8 leading-relaxed",
          sizes.description,
          "animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200"
        )}>
          {description}
        </p>
      )}

      {actions && actions.length > 0 && (
        <div className={cn(
          "flex flex-wrap gap-3 justify-center",
          "animate-in fade-in slide-in-from-bottom-2 duration-500 delay-300"
        )}>
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "default"}
              onClick={action.onClick}
              className={cn(
                sizes.button,
                "shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200",
                action.variant === "primary" || action.variant === "default"
                  ? `bg-gradient-to-r ${gradient} hover:opacity-90 text-white border-0`
                  : ""
              )}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// Preset empty states for common scenarios
export const EmptyStates = {
  NoPrompts: ({ onCreateNew }: { onCreateNew?: () => void }) => (
    <EmptyState
      type="noData"
      title="No prompts yet"
      description="Start building your prompt library by creating your first prompt. Organize your AI workflows with custom prompts tailored to your needs."
      actions={onCreateNew ? [
        { label: "Create Your First Prompt", onClick: onCreateNew, variant: "primary" }
      ] : undefined}
      size="lg"
    />
  ),

  NoSearchResults: ({ query, onClearSearch }: { query?: string; onClearSearch?: () => void }) => (
    <EmptyState
      type="noResults"
      title="No results found"
      description={query ? `No prompts match "${query}". Try adjusting your search terms or explore different categories.` : "No prompts match your current filters. Try adjusting your search criteria."}
      actions={onClearSearch ? [
        { label: "Clear Filters", onClick: onClearSearch, variant: "outline" }
      ] : undefined}
    />
  ),

  NoFolders: ({ onCreateFolder }: { onCreateFolder?: () => void }) => (
    <EmptyState
      type="noFolders"
      title="No folders yet"
      description="Keep your prompts organized by creating folders. Group related prompts together for easier access."
      actions={onCreateFolder ? [
        { label: "Create Your First Folder", onClick: onCreateFolder, variant: "primary" }
      ] : undefined}
      size="md"
    />
  ),

  NoTags: () => (
    <EmptyState
      type="noTags"
      title="No tags found"
      description="Tags help categorize and find your prompts quickly. Start adding tags to your prompts to see them here."
      size="md"
    />
  ),

  Error: ({ onRetry }: { onRetry?: () => void }) => (
    <EmptyState
      type="error"
      title="Something went wrong"
      description="We encountered an unexpected error while loading this content. Please try refreshing or contact support if the problem persists."
      actions={onRetry ? [
        { label: "Try Again", onClick: onRetry, variant: "default" }
      ] : undefined}
    />
  ),
};