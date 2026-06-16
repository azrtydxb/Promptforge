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

// FREE-plan gate (prototype frame 05): "Shared Prompts" + a "Free plan" badge.
export function SharedWithMeFreeTopbar() {
  return (
    <TopbarPortal>
      <TopbarTitle>Shared Prompts</TopbarTitle>
      <span className="ml-auto rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-[550] text-ink-500">
        Free plan
      </span>
    </TopbarPortal>
  );
}
