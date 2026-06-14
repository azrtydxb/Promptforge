"use client";

import { TopbarPortal } from "@/components/layout/topbar-portal";
import { TopbarTitle, TopbarSearch } from "@/components/layout/topbar";

export function SharedWithMeTopbar({ count }: { count: number }) {
  return (
    <TopbarPortal>
      <TopbarTitle>Shared Prompts</TopbarTitle>
      <span className="text-[12.5px] tabular-nums text-ink-400">{count} shared with you</span>
      <div className="ml-auto">
        <TopbarSearch placeholder="Search shared…" />
      </div>
    </TopbarPortal>
  );
}
