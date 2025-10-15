"use client";

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRef } from "react"
import * as React from "react"
import {
  Home,
  FileText,
  Tag,
  Zap,
  Shield,
  Heart,
  Layout,
  Share2,
  UsersRound,
} from "lucide-react"
import { useSidebar } from "@/components/providers/sidebar-provider"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ui/theme-toggle"

interface SidebarClientProps {
  isAdmin?: boolean;
}

const getNavigationItems = (isAdmin: boolean) => [
  {
    href: "/dashboard",
    icon: Home,
    label: "Dashboard",
    description: "Overview and analytics"
  },
  {
    href: "/prompts",
    icon: FileText,
    label: "My Prompts",
    description: "Manage your prompts"
  },
  {
    href: "/favorites",
    icon: Heart,
    label: "Favorites",
    description: "Your favorite prompts"
  },
  {
    href: "/templates",
    icon: Layout,
    label: "Templates",
    description: "Pre-built prompt templates"
  },
  {
    href: "/shared-prompts",
    icon: Share2,
    label: "Shared Prompts",
    description: "Collaborative workspace"
  },
  {
    href: "/teams",
    icon: UsersRound,
    label: "Teams",
    description: "Manage your teams"
  },
  {
    href: "/tags",
    icon: Tag,
    label: "Tags",
    description: "Organize by categories"
  },
  ...(isAdmin ? [{
    href: "/admin",
    icon: Shield,
    label: "Admin",
    description: "Admin dashboard"
  }] : [])
]

export function SidebarClient({ isAdmin = false }: SidebarClientProps) {
  const pathname = usePathname()
  const navigationItems = getNavigationItems(isAdmin)
  const { isCollapsed, setIsCollapsed } = useSidebar()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsCollapsed(false)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsCollapsed(true)
    }, 400) // 400ms delay before collapsing
  }

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 bottom-0 hidden border-r border-border bg-[hsl(var(--menu-bg))] md:block overflow-hidden z-40 transition-all duration-300",
        isCollapsed ? "w-[70px]" : "w-[260px]"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Main navigation"
      role="navigation"
    >
      <div className="flex h-full max-h-screen flex-col">
        {/* Logo Section */}
        <div className="flex h-[var(--topbar-height)] items-center px-4 bg-[hsl(var(--menu-bg))]">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 font-semibold group transition-all duration-200"
          >
            <div className="p-2 rounded bg-[hsl(var(--primary))] shadow-sm group-hover:shadow-md transition-all duration-200 flex-shrink-0">
              <Zap className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <span className={cn(
              "text-lg font-semibold text-white transition-all duration-300 overflow-hidden whitespace-nowrap",
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            )}>
              PromptForge
            </span>
          </Link>
        </div>
        
        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <nav className="px-4 py-6">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group relative",
                    isActive
                      ? 'bg-primary/20 text-white'
                      : 'text-[hsl(var(--menu-item-color))] hover:text-[hsl(var(--menu-item-hover-color))] hover:bg-white/5'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? 'text-white' : ''
                  )} />
                  <span className={cn(
                    "font-medium transition-all duration-300 overflow-hidden whitespace-nowrap",
                    isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}>
                    {item.label}
                  </span>

                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--primary))] rounded-r-full" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Theme Toggle at bottom */}
        <div className="border-t border-border/50 p-4">
          <div className={cn(
            "flex items-center gap-3",
            isCollapsed ? "justify-center" : "justify-start"
          )}>
            <ThemeToggle />
            {!isCollapsed && (
              <span className="text-sm text-[hsl(var(--menu-item-color))] transition-opacity duration-300">
                Theme
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}