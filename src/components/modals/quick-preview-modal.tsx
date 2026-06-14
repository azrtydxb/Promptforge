"use client";

import { useState } from "react";
import { useModal } from "@/hooks/use-modal-store";
import { useRouter } from "next/navigation";
import { Copy, Check, Star, Eye, Heart, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function QuickPreviewModal() {
  const { isOpen, onClose, type, data } = useModal();
  const isModalOpen = isOpen && type === "quickPreview";
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  if (!isModalOpen) return null;

  const {
    promptId,
    sharedId,
    title,
    category,
    content,
    author,
    rating,
    views,
    likes,
    copies,
  } = data.quickPreview ?? {};

  // Split content into segments, highlighting {{variables}}
  const renderContent = (text: string) => {
    const parts = text.split(/(\{\{[^}]+\}\})/g);
    return parts.map((part, i) => {
      if (/^\{\{[^}]+\}\}$/.test(part)) {
        return (
          <span
            key={i}
            className="inline-block bg-accent-100 text-accent-700 rounded-[4px] px-1 font-mono"
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleOpenFull = () => {
    onClose();
    if (sharedId) {
      router.push(`/shared-prompts/${sharedId}`);
    } else if (promptId) {
      router.push(`/prompts/${promptId}`);
    }
  };

  const handleCopyToLibrary = () => {
    toast.info("Copy to library coming soon");
  };

  const avatarInitials = author?.name
    ? author.name
        .split(" ")
        .map((n: string) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const stars = Math.round(rating ?? 0);

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-50 bg-[rgba(15,17,22,0.55)]"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-line-200 bg-surface-card shadow-[0_20px_60px_-12px_rgba(27,29,34,0.3)] flex flex-col max-h-[540px]"
        role="dialog"
        aria-modal="true"
        aria-label={`Quick preview: ${title ?? "prompt"}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-line-200 shrink-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {category && (
              <span className="rounded-full bg-accent-100 px-2.5 py-0.5 text-[10px] font-[600] uppercase tracking-[0.05em] text-accent-700">
                {category}
              </span>
            )}
            <span className="rounded-full bg-surface-muted border border-line-150 px-2.5 py-0.5 text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400">
              Quick preview
            </span>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-[7px] text-ink-400 hover:text-ink-700 hover:bg-surface-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pt-3.5 pb-1 shrink-0">
          <h2 className="text-[16px] font-[660] tracking-[-0.02em] text-ink-900 leading-snug">
            {title}
          </h2>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 px-5 pb-3.5 shrink-0">
          {/* Author */}
          {author && (
            <div className="flex items-center gap-1.5">
              {author.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={author.avatar}
                  alt={author.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-accent-100 flex items-center justify-center text-[9px] font-[600] text-accent-700">
                  {avatarInitials}
                </div>
              )}
              <span className="text-[12px] text-ink-600 font-[500]">
                {author.name}
              </span>
            </div>
          )}

          {/* Rating */}
          {rating !== undefined && (
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-3 w-3",
                    s <= stars ? "fill-star text-star" : "text-ink-400"
                  )}
                />
              ))}
              <span className="ml-1 text-[11px] tabular-nums text-ink-400">
                {rating.toFixed(1)}
              </span>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 text-[11px] tabular-nums text-ink-400 ml-auto">
            {views !== undefined && (
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {views.toLocaleString()}
              </span>
            )}
            {likes !== undefined && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                {likes.toLocaleString()}
              </span>
            )}
            {copies !== undefined && (
              <span className="flex items-center gap-1">
                <Copy className="h-3 w-3" />
                {copies.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Prompt content label */}
        <div className="px-5 pb-1.5 shrink-0">
          <span className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400">
            Prompt
          </span>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-3 min-h-0">
          <div className="rounded-[9px] border border-line-200 bg-surface-muted p-3.5 font-mono text-[12px] leading-[1.65] text-ink-700 whitespace-pre-wrap">
            {content ? (
              renderContent(content)
            ) : (
              <span className="text-ink-400 italic">No content</span>
            )}
          </div>
        </div>

        {/* Copy text action */}
        <div className="px-5 pb-3 shrink-0">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[12px] font-[550] text-accent-700 hover:text-accent-500 transition-colors"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied!" : "Copy text"}
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-line-200 shrink-0">
          <button
            onClick={handleOpenFull}
            className="flex items-center gap-1.5 rounded-[7px] border border-line-200 bg-surface-card px-3.5 py-2 text-[13px] font-[550] text-ink-700 hover:border-accent-500 hover:text-accent-700 transition-colors"
          >
            Open full prompt
          </button>
          <button
            onClick={handleCopyToLibrary}
            className="flex items-center gap-1.5 rounded-[7px] bg-accent-500 px-4 py-2 text-[13px] font-[550] text-white hover:bg-accent-500/90 transition-colors"
          >
            Copy to my library
          </button>
        </div>
      </div>
    </>
  );
}
