"use client";

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  FileText,
  Tag,
  Zap,
  Users,
  ChevronRight,
  Shield,
  Star,
  Layout,
} from "lucide-react"
import { dellNavItem } from "@/lib/styles"

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
    <div className="hidden border-r border-border bg-[hsl(var(--primary))] shadow-sm md:block overflow-hidden">
      <div className="flex h-full max-h-screen flex-col gap-2">
        {/* Enhanced Header with gradient and professional styling */}
        <div className="flex h-14 items-center border-b border-primary/10 px-4 lg:h-[60px] lg:px-6 bg-[hsl(var(--primary))] relative">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold text-primary-foreground group transition-colors duration-200"
          >
            <div className="p-1 rounded-md bg-primary-foreground/10 group-hover:bg-primary-foreground/20 transition-colors duration-200">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-primary-foreground tracking-wide">PromptForge</span>
          </Link>
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
        
        {/* Enhanced Navigation */}
        <div className="flex-1 py-4 overflow-hidden">
          <nav className="grid items-start px-3 text-sm font-medium space-y-3 overflow-hidden">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={dellNavItem(isActive, true)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`
                      p-1.5 rounded-md transition-all duration-200
                      ${isActive
                        ? 'bg-[hsl(var(--accent))]/15 shadow-sm'
                        : 'bg-primary-foreground/5 group-hover:bg-primary-foreground/10'
                      }
                    `}>
                      <Icon className="h-4 w-4 flex-shrink-0 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate text-primary-foreground">{item.label}</div>
                      <div className={`
                        text-xs truncate transition-opacity duration-200 text-primary-foreground
                        ${isActive ? 'opacity-80' : 'opacity-60 group-hover:opacity-70'}
                      `}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                  
                  {/* Active indicator with smooth animation */}
                  <ChevronRight className={`
                    h-3 w-3 flex-shrink-0 transition-all duration-200 text-primary-foreground
                    ${isActive
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 -translate-x-2 group-hover:opacity-60 group-hover:translate-x-0'
                    }
                  `} />
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}