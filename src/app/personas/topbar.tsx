"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { TopbarPortal } from "@/components/layout/topbar-portal";
import { TopbarTitle, TopbarNewButton } from "@/components/layout/topbar";

export function PersonasTopbar({ count }: { count: number }) {
  const router = useRouter();
  return (
    <TopbarPortal>
      <TopbarTitle>Agent Personas</TopbarTitle>
      <span className="text-[12.5px] tabular-nums text-ink-400">
        {count} {count === 1 ? "persona" : "personas"}
      </span>
      <div className="ml-auto">
        <TopbarNewButton
          label="New persona"
          onClick={() => router.push("/personas/new")}
        />
      </div>
    </TopbarPortal>
  );
}

/** Topbar for the create page: back-to-list + title. */
export function PersonaNewTopbar() {
  return (
    <TopbarPortal>
      <Link
        href="/personas"
        className="flex items-center gap-1 text-[12.5px] font-[550] text-ink-400 transition-colors hover:text-ink-700"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Agent Personas
      </Link>
      <TopbarTitle>New persona</TopbarTitle>
    </TopbarPortal>
  );
}

/** Topbar for the editor: back-to-list + the persona name. */
export function PersonaEditorTopbar({ name }: { name: string }) {
  return (
    <TopbarPortal>
      <Link
        href="/personas"
        className="flex items-center gap-1 text-[12.5px] font-[550] text-ink-400 transition-colors hover:text-ink-700"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Agent Personas
      </Link>
      <TopbarTitle>{name}</TopbarTitle>
    </TopbarPortal>
  );
}
