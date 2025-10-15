"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
  gradient?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
  gradient = "from-blue-600 to-purple-600"
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4 mb-8", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link
            href="/dashboard"
            className="flex items-center hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
          </Link>
          {breadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <ChevronRight className="h-4 w-4" />
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </div>
          ))}
        </nav>
      )}

      {/* Title and Actions */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1
            className={cn(
              "text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
              gradient
            )}
          >
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground mt-2 text-base leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Divider with gradient */}
      <div className="relative h-px bg-border">
        <div className={cn(
          "absolute left-0 top-0 h-px w-32 bg-gradient-to-r opacity-75",
          gradient
        )} />
      </div>
    </div>
  );
}
