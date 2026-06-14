"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  Heart,
  LayoutTemplate,
  Share2,
  Store,
  Users,
  Tag,
} from "lucide-react";

const mobileNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/prompts", icon: FileText, label: "My Prompts" },
  { href: "/favorites", icon: Heart, label: "Favorites" },
  { href: "/templates", icon: LayoutTemplate, label: "Templates" },
  { href: "/shared-with-me", icon: Share2, label: "Shared Prompts" },
  { href: "/shared-prompts", icon: Store, label: "Prompt Market" },
  { href: "/teams", icon: Users, label: "Teams" },
  { href: "/tags", icon: Tag, label: "Tags" },
];

/**
 * App shell topbar — a 54px white bar (prototype). Its CONTENT is contextual and provided
 * per-screen via <TopbarPortal> into #pf-topbar. The bar itself only owns the mobile-nav
 * trigger; the user/workspace switcher lives in the sidebar footer.
 */
export function Header() {
  return (
    <header
      className="sticky top-0 z-40 flex h-[54px] flex-shrink-0 items-center gap-3.5 border-b border-line-200 bg-surface-card px-5"
      role="banner"
    >
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 text-ink-600 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <nav className="grid gap-1 pt-4" aria-label="Main navigation">
            {mobileNav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] text-ink-700 transition-colors hover:bg-surface-muted"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Contextual topbar content portals in here */}
      <div id="pf-topbar" className="flex w-full items-center gap-3.5" />
    </header>
  );
}
