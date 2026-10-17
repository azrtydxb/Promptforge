"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, Copy, Check, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface PersonaCardData {
  id: string;
  name: string;
  role: string | null;
  description: string | null;
  tone: string | null;
  model: string | null;
  tags: string[];
  systemPrompt: string;
  updatedAt: Date;
}

export function PersonaCard({ persona }: { persona: PersonaCardData }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(persona.systemPrompt);
      setCopied(true);
      toast.success("System prompt copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-[11px] border border-line-200 bg-surface-card p-4 transition-shadow hover:shadow-[0_12px_32px_-12px_rgba(27,29,34,0.22)]">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] bg-accent-100 text-accent-500">
          <Bot className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[14px] font-[620] tracking-[-0.01em] text-ink-900">
            {persona.name}
          </h3>
          {persona.role && (
            <p className="truncate text-[12px] text-ink-400">{persona.role}</p>
          )}
        </div>
      </div>

      {/* Description */}
      {persona.description && (
        <p className="line-clamp-2 text-[12px] leading-[1.5] text-ink-600">
          {persona.description}
        </p>
      )}

      {/* Meta chips */}
      <div className="flex flex-wrap gap-1">
        {persona.tone && (
          <span className="rounded-full bg-[#F1F2F5] px-2 py-0.5 text-[10px] font-[550] text-ink-600">
            {persona.tone}
          </span>
        )}
        {persona.model && (
          <span className="rounded-full bg-[#F1F2F5] px-2 py-0.5 font-mono text-[10px] font-[550] text-ink-600">
            {persona.model}
          </span>
        )}
        {persona.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[#F1F2F5] px-2 py-0.5 text-[10px] font-[550] text-ink-600"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between border-t border-line-150 pt-3">
        <span className="text-[11px] text-ink-400">
          Updated{" "}
          {formatDistanceToNow(new Date(persona.updatedAt), {
            addSuffix: true,
          })}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy system prompt"
            className="flex items-center gap-1 rounded-[7px] border border-line-200 bg-surface-muted px-2 py-1 text-[11.5px] font-[550] text-ink-700 transition-colors hover:border-accent-500 hover:text-accent-700"
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            Copy
          </button>
          <Link
            href={`/personas/${persona.id}`}
            className="flex items-center gap-1 text-[11.5px] font-[550] text-accent-700 transition-colors hover:text-accent-500"
          >
            Open
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
