"use client";

import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  Heart,
  LayoutTemplate,
  Store,
  Tag,
  Menu,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AuthUserButton } from "../auth/user-button";
import { TeamSwitcher } from "@/components/teams/team-switcher";

const mobileNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/prompts", icon: FileText, label: "My Prompts" },
  { href: "/favorites", icon: Heart, label: "Favorites" },
  { href: "/templates", icon: LayoutTemplate, label: "Templates" },
  { href: "/shared-prompts", icon: Store, label: "Prompt Market" },
  { href: "/tags", icon: Tag, label: "Tags" },
];

export function Header() {
  return (
    <header
      className="sticky top-0 z-40 flex h-[54px] items-center gap-3.5 border-b border-line-200 bg-surface-card px-5"
      role="banner"
    >
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-ink-600 md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <nav
            id="main-navigation"
            className="grid gap-1 pt-4"
            aria-label="Main navigation"
          >
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

      <div className="flex-1">
        <TeamSwitcher className="max-w-xs" />
      </div>

      <div className="flex items-center justify-end gap-3">
        <AuthUserButton />
      </div>
    </header>
  );
}
