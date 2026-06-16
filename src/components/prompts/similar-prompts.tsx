"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSimilarSharedPrompts } from "@/app/actions/shared-prompts.actions";

interface SimilarPromptsProps {
  /** The SharedPrompt.id of the current prompt */
  promptId: string;
  className?: string;
  onHasContent?: (hasContent: boolean) => void;
}

interface SimilarPrompt {
  id: string;
  title: string;
  category: string | null;
  author: { username: string | null; name: string | null };
}

export function SimilarPrompts({ promptId, className, onHasContent }: SimilarPromptsProps) {
  const [items, setItems] = useState<SimilarPrompt[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSimilarSharedPrompts(promptId).then((result) => {
      if (!cancelled && result.success) {
        const prompts = result.prompts as SimilarPrompt[];
        setItems(prompts);
        onHasContent?.(prompts.length > 0);
      } else if (!cancelled) {
        onHasContent?.(false);
      }
      if (!cancelled) setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [promptId, onHasContent]);

  if (!loaded || items.length === 0) return null;

  return (
    <ul className={`flex flex-col gap-2 ${className ?? ""}`}>
      {items.map((p) => (
        <li key={p.id}>
          <Link
            href={`/shared-prompts/${p.id}`}
            className="text-sm text-accent-700 hover:underline line-clamp-2"
          >
            {p.title}
          </Link>
          <p className="text-[11px] text-ink-400 mt-0.5">
            {p.author.name ?? p.author.username ?? "Unknown"}
          </p>
        </li>
      ))}
    </ul>
  );
}
