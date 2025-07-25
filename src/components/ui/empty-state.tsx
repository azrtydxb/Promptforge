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

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizes.container,
        className
      )}
    >
      <div className={cn(
        "rounded-full bg-muted p-4 mb-4",
        "animate-in fade-in zoom-in duration-500"
      )}>
        <Icon className={cn(
          sizes.icon,
          "text-muted-foreground"
        )} />
      </div>
      
      <h3 className={cn(
        "font-semibold text-foreground mb-2",
        sizes.title,
        "animate-in fade-in slide-in-from-bottom-1 duration-500 delay-100"
      )}>
        {title}
      </h3>
      
      {description && (
        <p className={cn(
          "text-muted-foreground max-w-md mb-6",
          sizes.description,
          "animate-in fade-in slide-in-from-bottom-1 duration-500 delay-200"
        )}>
          {description}
        </p>
      )}
      
      {actions && actions.length > 0 && (
        <div className={cn(
          "flex flex-wrap gap-3 justify-center",
          "animate-in fade-in slide-in-from-bottom-1 duration-500 delay-300"
        )}>
          {actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "default"}
              onClick={action.onClick}
              className={sizes.button}
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
      description="Start building your prompt library by creating your first prompt."
      actions={onCreateNew ? [
        { label: "Create First Prompt", onClick: onCreateNew, variant: "primary" }
      ] : undefined}
    />
  ),
  
  NoSearchResults: ({ query, onClearSearch }: { query?: string; onClearSearch?: () => void }) => (
    <EmptyState
      type="noResults"
      title="No results found"
      description={query ? `No prompts match "${query}". Try different keywords or filters.` : "No prompts match your search criteria."}
      actions={onClearSearch ? [
        { label: "Clear Search", onClick: onClearSearch, variant: "outline" }
      ] : undefined}
    />
  ),
  
  NoFolders: ({ onCreateFolder }: { onCreateFolder?: () => void }) => (
    <EmptyState
      type="noFolders"
      title="No folders yet"
      description="Organize your prompts by creating folders."
      actions={onCreateFolder ? [
        { label: "Create Folder", onClick: onCreateFolder, variant: "primary" }
      ] : undefined}
      size="sm"
    />
  ),
  
  NoTags: () => (
    <EmptyState
      type="noTags"
      title="No tags found"
      description="Tags will appear here once you start tagging your prompts."
      size="sm"
    />
  ),
  
  Error: ({ onRetry }: { onRetry?: () => void }) => (
    <EmptyState
      type="error"
      title="Something went wrong"
      description="We encountered an error while loading this content. Please try again."
      actions={onRetry ? [
        { label: "Retry", onClick: onRetry, variant: "outline" }
      ] : undefined}
    />
  ),
};