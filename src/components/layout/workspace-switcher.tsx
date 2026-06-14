"use client";

import { useRouter } from "next/navigation";
import { User, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Quick switcher between Personal and Team workspaces — the single intentional addition
 * over the prototype (per the brief). Lives in the sidebar footer; `children` is the trigger.
 */
export function WorkspaceSwitcher({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full text-left focus:outline-none">{children}</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-[200px]">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.05em] text-ink-400">
          Switch workspace
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => router.push("/dashboard")} className="gap-2 text-[13px]">
          <User className="h-4 w-4" /> Personal workspace
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/teams")} className="gap-2 text-[13px]">
          <Users className="h-4 w-4" /> Team workspace
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")} className="text-[13px]">
          Account settings
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
