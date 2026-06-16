"use client";

import { TopbarPortal } from "@/components/layout/topbar-portal";
import { TopbarTitle } from "@/components/layout/topbar";

export function FavoritesTopbar({ count }: { count: number }) {
  return (
    <TopbarPortal>
      <TopbarTitle>Favorites</TopbarTitle>
      <span className="text-[12.5px] tabular-nums text-ink-400">{count} saved</span>
    </TopbarPortal>
  );
}
