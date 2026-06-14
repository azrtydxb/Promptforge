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

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AuthUserButton } from "../auth/user-button";

const mobileNav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/prompts", icon: FileText, label: "My Prompts" },
  { href: "/favorites", icon: Heart, label: "Favorites" },
  { href: "/templates", icon: LayoutTemplate, label: "Templates" },
  { href: "/shared-prompts", icon: Store, label: "Prompt Market" },
  { href: "/tags", icon: Tag, label: "Tags" },
];

export function Header() {
  const router = useRouter();
  const [q, setQ] = useState("");
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

      <div className="flex max-w-md flex-1 items-center">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/prompts?search=${encodeURIComponent(q.trim())}`);
          }}
          className="relative w-full"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-8 w-full rounded-[7px] border border-line-200 bg-surface-muted pl-9 pr-12 text-[13px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[4px] border border-line-200 bg-surface-card px-1.5 py-0.5 font-mono text-[10px] text-ink-400">
            ⌘K
          </kbd>
        </form>
      </div>

      <div className="ml-auto flex items-center justify-end gap-3">
        <AuthUserButton />
      </div>
    </header>
  );
}
