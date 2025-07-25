"use client";

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  FileText,
  Tag,
  Zap,
  Users,
  Shield,
  Star,
  Layout,
} from "lucide-react"

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
    icon: Star,
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
    icon: Users,
    label: "Shared Prompts",
    description: "Collaborative workspace"
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

  return (
    <div className="fixed left-0 top-0 bottom-0 hidden border-r border-border bg-white dark:bg-[hsl(var(--menu-bg))] md:block overflow-hidden w-[260px] z-40">
      <div className="flex h-full max-h-screen flex-col">
        {/* Logo Section */}
        <div className="flex h-[var(--topbar-height)] items-center px-6 bg-white dark:bg-[hsl(var(--menu-bg))]">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 font-semibold group transition-all duration-200"
          >
            <div className="p-2 rounded bg-[hsl(var(--primary))] shadow-sm group-hover:shadow-md transition-all duration-200">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-foreground dark:text-white">PromptForge</span>
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
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group relative
                    ${isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-white'
                      : 'text-muted-foreground dark:text-[hsl(var(--menu-item-color))] hover:text-foreground dark:hover:text-[hsl(var(--menu-item-hover-color))] hover:bg-primary/5 dark:hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary dark:text-white' : ''}`} />
                  <span className="font-medium">{item.label}</span>
                  
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[hsl(var(--primary))] rounded-r-full" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}