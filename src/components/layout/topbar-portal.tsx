"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders its children into the contextual topbar slot (#pf-topbar) in the app shell.
 * Each screen provides its exact prototype topbar (title + search + per-page actions).
 */
export function TopbarPortal({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById("pf-topbar"));
  }, []);

  if (!target) return null;
  return createPortal(children, target);
}
