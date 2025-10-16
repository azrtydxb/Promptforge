"use client";

import Link from "next/link"
import { usePathname } from "next/navigation"
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

  // Set sidebar to expanded on mount
  React.useEffect(() => {
    setIsCollapsed(false)
  }, [setIsCollapsed])

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 bottom-0 hidden border-r border-border bg-[hsl(var(--menu-bg))] md:block overflow-hidden z-30 transition-all duration-300",
        isCollapsed ? "w-[70px]" : "w-[260px]"
      )}
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
                    "flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative mb-1",
                    isActive
                      ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-white shadow-md border-l-4 border-l-primary'
                      : 'text-[hsl(var(--menu-item-color))] hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 hover:shadow-sm hover:border-l-4 hover:border-l-primary/50'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className={cn(
                    "p-1.5 rounded-md transition-all duration-200",
                    isActive
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-md'
                      : 'bg-white/5 group-hover:bg-gradient-to-br group-hover:from-blue-500/80 group-hover:to-purple-600/80'
                  )}>
                    <Icon className="h-4 w-4 text-white flex-shrink-0" />
                  </div>
                  <span className={cn(
                    "font-medium transition-all duration-300 overflow-hidden whitespace-nowrap",
                    isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
                    isActive && "font-semibold"
                  )}>
                    {item.label}
                  </span>

                  {/* Subtle glow effect for active item */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-lg opacity-50 pointer-events-none" />
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