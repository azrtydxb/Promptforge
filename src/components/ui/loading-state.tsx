"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { dellSpinner } from "@/lib/styles";

interface LoadingStateProps {
  className?: string;
  children?: ReactNode;
}

// Standardized loading patterns for different content types
export const LoadingStates = {
  // For card grids (prompts, templates, etc.)
  CardGrid: ({ count = 6, className }: { count?: number; className?: string }) => (
    <div className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-lg" />
      ))}
    </div>
  ),

  // For lists with items
  List: ({ count = 5, className }: { count?: number; className?: string }) => (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-md" />
      ))}
    </div>
  ),

  // For sidebar content
  Sidebar: ({ className }: { className?: string }) => (
    <div className={cn("space-y-4 p-4", className)}>
      <Skeleton className="h-8 w-32 mb-4" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      ))}
    </div>
  ),

  // For tables
  Table: ({ rows = 5, columns = 4, className }: { rows?: number; columns?: number; className?: string }) => (
    <div className={cn("w-full", className)}>
      <div className="mb-4">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                className={cn(
                  "h-12 rounded-md",
                  colIndex === 0 ? "w-1/4" : "flex-1"
                )} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  ),

  // For form content
  Form: ({ fields = 3, className }: { fields?: number; className?: string }) => (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-md" />
    </div>
  ),

  // For detail pages
  DetailPage: ({ className }: { className?: string }) => (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    </div>
  ),

  // For inline content
  Inline: ({ width = "w-full", height = "h-4", className }: { width?: string; height?: string; className?: string }) => (
    <Skeleton className={cn(width, height, className)} />
  ),

  // Centered spinner for modals/overlays
  Spinner: ({ label, className }: { label?: string; className?: string }) => (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <div className={dellSpinner('lg', "mb-4")} />
      {label && (
        <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
      )}
    </div>
  ),
};