"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Heart,
  LayoutTemplate,
  Store,
  Share2,
  Users,
  Tag,
  Shield,
  ArrowUpRight,
  ChevronsUpDown,
} from "lucide-react";
import { Avatar, type AvatarUser } from "@/components/ui/avatar";
import { WorkspaceSwitcher } from "./workspace-switcher";
import type { Plan } from "@/lib/plan";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count?: number;
  /** Minimum plan required to see this item. */
  requiresTeam?: boolean;
}

export interface SidebarClientProps {
  user: AvatarUser;
  userName: string;
  isAdmin: boolean;
  plan: Plan;
  roleLabel: string;
  counts: { prompts: number; favorites: number };
}

export function SidebarClient({
  user,
  userName,
  isAdmin,
  plan,
  roleLabel,
  counts,
}: SidebarClientProps) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/prompts", icon: FileText, label: "My Prompts", count: counts.prompts },
    { href: "/favorites", icon: Heart, label: "Favorites", count: counts.favorites },
    { href: "/templates", icon: LayoutTemplate, label: "Templates" },
    { href: "/shared-with-me", icon: Share2, label: "Shared Prompts", requiresTeam: true },
    { href: "/shared-prompts", icon: Store, label: "Prompt Market" },
    { href: "/teams", icon: Users, label: "Teams", requiresTeam: true },
    { href: "/tags", icon: Tag, label: "Tags" },
  ];

  const visible = items.filter((i) => !(i.requiresTeam && plan === "FREE"));

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-30 hidden w-[216px] flex-col bg-rail-bg md:flex"
      aria-label="Main navigation"
    >
      {/* Logo header */}
      <div className="flex h-[54px] flex-shrink-0 items-center gap-2.5 border-b border-rail-border px-3.5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-[23px] w-[23px] items-center justify-center rounded-[6px] bg-accent-500">
            <span className="block h-[9px] w-[9px] rotate-45 rounded-[1.5px] bg-white" />
          </span>
          <span className="text-[13.5px] font-[640] tracking-tight text-[#EEF0F3]">
            Promptforge
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-px overflow-y-auto p-2.5">
        {visible.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-[6px] px-2.5 py-[7px] text-[12.5px] transition-colors",
                active
                  ? "bg-accent-500 font-[550] text-white"
                  : "text-rail-text hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-[15px] w-[15px] flex-shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {typeof item.count === "number" && (
                <span
                  className={cn(
                    "tabular-nums text-[11px]",
                    active ? "text-[#CDD2F5]" : "text-rail-text-dim"
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-2 border-t border-rail-border" />
            <Link
              href="/admin"
              aria-current={
                pathname === "/admin" || pathname.startsWith("/admin/")
                  ? "page"
                  : undefined
              }
              className={cn(
                "flex items-center gap-2.5 rounded-[6px] px-2.5 py-[7px] text-[12.5px] transition-colors",
                pathname === "/admin" || pathname.startsWith("/admin/")
                  ? "bg-accent-500 font-[550] text-white"
                  : "text-rail-text hover:bg-white/5 hover:text-white"
              )}
            >
              <Shield className="h-[15px] w-[15px] flex-shrink-0" />
              <span className="flex-1 truncate">Admin</span>
            </Link>
          </>
        )}
      </nav>

      {/* Upgrade promo (free users) */}
      {plan === "FREE" && (
        <div className="px-2.5 pb-2.5">
          <Link
            href="/plans"
            className="block rounded-[10px] bg-gradient-to-br from-accent-500 to-accent-400 p-3 text-white transition-opacity hover:opacity-95"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-[600]">Upgrade to Teams</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
            <p className="mt-1 text-[11px] leading-snug text-white/80">
              Share prompts, add seats &amp; roles.
            </p>
          </Link>
        </div>
      )}

      {/* Footer — user + workspace quick-switcher (the one allowed extra) */}
      <WorkspaceSwitcher>
        <div className="flex items-center gap-2.5 border-t border-rail-border px-3.5 py-3 hover:bg-white/5">
          <Avatar user={user} isCurrentUser size="sm" />
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-[12px] font-[550] leading-[1.2] text-[#EEF0F3]">
              {userName}
            </div>
            <div className="truncate text-[10.5px] text-rail-text-dim">{roleLabel}</div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 flex-shrink-0 text-rail-text-dim" />
        </div>
      </WorkspaceSwitcher>
    </aside>
  );
}
