"use client";

import { useState, useEffect, useCallback } from "react";
import { useModal } from "@/hooks/use-modal-store";
import {
  createShareLink,
  getUserShareLinks,
  updateShareLink,
  deleteShareLink,
} from "@/app/actions/prompt-share.actions";
import { publishPromptToMarketplace } from "@/app/actions/shared-prompts.actions";
import {
  Copy,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Share2,
  X,
  Globe,
  Link,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ShareLinkItem {
  id: string;
  shareId: string;
  title: string;
  description: string | null;
  isActive: boolean;
  expiresAt: Date | null;
  maxViews: number | null;
  createdAt: Date;
  viewCount: number;
  isExpired: boolean;
  prompt: {
    id: string;
    title: string;
  };
}

type Permission = "view" | "edit";

export function SharePromptModal() {
  const { isOpen, onClose, type, data } = useModal();
  const isModalOpen = isOpen && type === "sharePrompt";
  const { promptData } = data;

  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // People section
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermission, setInvitePermission] = useState<Permission>("view");
  const [shareLinks, setShareLinks] = useState<ShareLinkItem[]>([]);

  // Publish section
  const [isPublished, setIsPublished] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);

  const appOrigin =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
      : "";

  const shareUrl = (shareId: string) => `${appOrigin}/share/${shareId}`;

  const publicUrl = promptData
    ? `${appOrigin}/shared-prompts/${promptData.id}`
    : null;

  const loadShareLinks = useCallback(async () => {
    if (!promptData) return;
    try {
      const links = await getUserShareLinks();
      const promptLinks = links.filter((l) => l.prompt.id === promptData.id);
      setShareLinks(promptLinks as ShareLinkItem[]);
    } catch {
      // ignore
    }
  }, [promptData]);

  useEffect(() => {
    if (isModalOpen && promptData) {
      loadShareLinks();
    }
  }, [isModalOpen, promptData, loadShareLinks]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleInvite = async () => {
    if (!promptData || !inviteEmail.trim()) return;
    setIsLoading(true);
    try {
      await createShareLink({
        promptId: promptData.id,
        title: `Shared with ${inviteEmail}`,
        description: `Permission: ${invitePermission}`,
        settings: { expiresIn: "never", showAuthor: true, allowEmbed: false },
      });
      toast.success(`Invited ${inviteEmail}`);
      setInviteEmail("");
      await loadShareLinks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    setIsLoading(true);
    try {
      await deleteShareLink(linkId);
      await loadShareLinks();
    } catch {
      toast.error("Failed to remove");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (link: ShareLinkItem) => {
    try {
      await updateShareLink(link.id, { isActive: !link.isActive });
      await loadShareLinks();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handlePublishToggle = async () => {
    if (!promptData) return;
    if (isPublished) {
      setIsPublished(false);
      setPublishedUrl(null);
      return;
    }
    setPublishLoading(true);
    try {
      await publishPromptToMarketplace({ promptId: promptData.id });
      setIsPublished(true);
      setPublishedUrl(publicUrl);
      toast.success("Published to Prompt Market");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to publish"
      );
    } finally {
      setPublishLoading(false);
    }
  };

  if (!isModalOpen) return null;

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-50 bg-[rgba(15,17,22,0.55)]"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-line-200 bg-surface-card shadow-[0_20px_60px_-12px_rgba(27,29,34,0.3)] max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Share prompt"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-line-200 sticky top-0 bg-surface-card z-10">
          <div>
            <h2 className="text-[15px] font-[660] tracking-[-0.015em] text-ink-900">
              Share prompt
            </h2>
            {promptData?.title && (
              <p className="text-[12px] text-ink-400 mt-0.5 truncate max-w-[340px]">
                {promptData.title}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-[7px] text-ink-400 hover:text-ink-700 hover:bg-surface-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Info */}
          <p className="text-[13px] text-ink-600 leading-[1.5]">
            Share privately with people, publish to the Prompt Market, or both.
          </p>

          {/* ── SHARE WITH PEOPLE ── */}
          <div>
            <span className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400 flex items-center gap-1.5 mb-3">
              <Users className="h-3 w-3" />
              Share with people
            </span>

            {/* Invite row */}
            <div className="flex gap-2 mb-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInvite();
                }}
                placeholder="Email address"
                className="flex-1 min-w-0 rounded-[7px] border border-line-200 bg-surface-muted px-3 py-2 text-[12px] text-ink-700 placeholder:text-ink-400 outline-none focus:border-accent-500 transition-colors"
              />
              <select
                value={invitePermission}
                onChange={(e) =>
                  setInvitePermission(e.target.value as Permission)
                }
                className="rounded-[7px] border border-line-200 bg-surface-muted px-2.5 py-2 text-[12px] text-ink-700 outline-none focus:border-accent-500 transition-colors"
              >
                <option value="view">Can view</option>
                <option value="edit">Can edit</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={isLoading || !inviteEmail.trim()}
                className="rounded-[7px] bg-accent-500 px-3.5 py-2 text-[12px] font-[550] text-white hover:bg-accent-500/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Invite
              </button>
            </div>

            {/* People list */}
            <div className="rounded-[9px] border border-line-200 overflow-hidden divide-y divide-line-200">
              {/* Owner row */}
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent-100 flex items-center justify-center text-[10px] font-[600] text-accent-700">
                    Y
                  </div>
                  <span className="text-[12px] text-ink-700">You</span>
                </div>
                <span className="text-[11px] text-ink-400 font-[500]">
                  Owner
                </span>
              </div>

              {shareLinks.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-surface-muted border border-line-200 flex items-center justify-center text-[10px] font-[600] text-ink-400 shrink-0">
                      {link.title[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span className="text-[12px] text-ink-700 truncate">
                      {link.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={cn(
                        "text-[11px] font-[500]",
                        link.isActive ? "text-ink-600" : "text-ink-400"
                      )}
                    >
                      {link.isActive ? "Active" : "Inactive"}
                    </span>
                    <button
                      onClick={() => handleToggleActive(link)}
                      className="p-1 rounded-[5px] text-ink-400 hover:text-ink-700 hover:bg-surface-muted transition-colors"
                      aria-label={link.isActive ? "Deactivate" : "Activate"}
                    >
                      {link.isActive ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-1 rounded-[5px] text-ink-400 hover:text-danger hover:bg-surface-muted transition-colors"
                      aria-label="Delete link"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Copy link row */}
            {shareLinks.length > 0 && shareLinks[0] && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-[7px] border border-line-200 bg-surface-muted px-3 py-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Link className="h-3.5 w-3.5 text-ink-400 shrink-0" />
                  <span className="text-[11px] text-ink-600 truncate">
                    Anyone with the link
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleCopy(shareUrl(shareLinks[0].shareId), "link-row")
                  }
                  className="flex items-center gap-1 text-[11px] font-[550] text-accent-700 hover:text-accent-500 transition-colors shrink-0"
                >
                  {copied === "link-row" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copy link
                </button>
              </div>
            )}
          </div>

          {/* ── PUBLISH TO PROMPT MARKET ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400 flex items-center gap-1.5">
                <Globe className="h-3 w-3" />
                Publish to Prompt Market
              </span>
              {/* Toggle */}
              <button
                onClick={handlePublishToggle}
                disabled={publishLoading}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50",
                  isPublished ? "bg-accent-500" : "bg-line-200"
                )}
                role="switch"
                aria-checked={isPublished}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                    isPublished ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>

            {isPublished && (
              <div className="space-y-2.5 rounded-[9px] border border-line-200 bg-surface-muted p-3.5">
                {/* Stats */}
                <div className="flex items-center gap-4 text-[11px] tabular-nums text-ink-400">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> 0 views
                  </span>
                  <span className="flex items-center gap-1">
                    <Share2 className="h-3 w-3" /> 0 copies
                  </span>
                </div>

                {/* Public URL */}
                {(publishedUrl ?? publicUrl) && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={(publishedUrl ?? publicUrl) ?? ""}
                      readOnly
                      className="flex-1 min-w-0 rounded-[7px] border border-line-200 bg-surface-card px-2.5 py-1.5 text-[11px] font-mono text-ink-600 outline-none"
                    />
                    <button
                      onClick={() =>
                        handleCopy(
                          (publishedUrl ?? publicUrl) ?? "",
                          "pub-url"
                        )
                      }
                      className="flex items-center gap-1 rounded-[7px] border border-line-200 bg-surface-card px-2.5 py-1.5 text-[11px] font-[550] text-ink-700 hover:border-accent-500 hover:text-accent-700 transition-colors shrink-0"
                    >
                      {copied === "pub-url" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-line-200 sticky bottom-0 bg-surface-card">
          <button
            onClick={onClose}
            className="rounded-[7px] border border-line-200 px-3.5 py-2 text-[13px] font-[550] text-ink-700 hover:border-line-150 hover:bg-surface-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="rounded-[7px] bg-accent-500 px-4 py-2 text-[13px] font-[550] text-white hover:bg-accent-500/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
