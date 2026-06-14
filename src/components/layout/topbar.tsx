"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Page title in the topbar — prototype: 15px / 640 / -0.01em. */
export function TopbarTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="m-0 text-[15px] font-[640] tracking-[-0.01em] text-ink-900">{children}</h3>
  );
}

/** Topbar search field — prototype: 260px, #f3f4f7, 1px #e4e6eb, radius 7, ⌘K mono hint. */
export function TopbarSearch({
  placeholder = "Search…",
  width = 260,
}: {
  placeholder?: string;
  width?: number;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/prompts?search=${encodeURIComponent(q.trim())}`);
      }}
      className="relative ml-3.5"
      style={{ width }}
    >
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9aa0ab]" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="h-[30px] w-full rounded-[7px] border border-line-200 bg-surface-muted pl-8 pr-10 text-[12.5px] text-ink-900 placeholder:text-[#9aa0ab] focus:outline-none"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ink-300">
        ⌘K
      </kbd>
    </form>
  );
}

/** Segmented control — prototype: #f3f4f7 track, active = white chip. */
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-[7px] border border-line-200 bg-surface-muted p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "rounded-[5px] px-[11px] py-1 text-[11.5px] transition-colors",
            opt === value
              ? "bg-surface-card font-[550] text-ink-900 shadow-[0_1px_1px_rgba(0,0,0,0.04)]"
              : "font-[500] text-ink-400"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

/** Primary topbar action button — prototype: #5e6ad2, 7px 13px, radius 7. */
export function TopbarNewButton({
  label,
  onClick,
  icon = true,
}: {
  label: string;
  onClick?: () => void;
  icon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-[5px] rounded-[7px] bg-accent-500 px-[13px] py-[7px] text-[12.5px] font-[550] text-white hover:bg-[#4F5AC4]"
    >
      {icon && <Plus className="h-[13px] w-[13px]" strokeWidth={2.3} />}
      {label}
    </button>
  );
}
