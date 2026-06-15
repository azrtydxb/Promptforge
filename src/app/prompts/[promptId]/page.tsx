"use client";

import { useEffect, useState } from "react";
import { getPromptByIdRedis as getPromptById } from "@/app/actions/prompt.actions.redis";
import { updatePrompt, createPrompt, updatePromptLastUsed } from "@/app/actions/prompt.actions";
import { EditorWithHistory } from "@/components/editor/editor-with-history";
import type { Prompt, Tag, PromptVersion } from "@/generated/prisma";
import { useDebounce } from "@/hooks/use-debounce";
import { useAutoSaveDraft } from "@/hooks/use-auto-save-draft";
import { SaveStatusIndicator } from "@/components/editor/save-status-indicator";
import { DraftRecoveryDialog } from "@/components/editor/draft-recovery-dialog";
import type { Draft } from "@/services/draft-storage";
import { PromptHistoryTimeline } from "@/components/prompts/prompt-history-timeline";
import { EnhancedTagInput } from "@/components/prompts/enhanced-tag-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Save, ArrowLeft, Copy, Check, Share2, Eye, Split, Code2, Star, Pencil } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TopbarPortal } from "@/components/layout/topbar-portal";
import { TopbarTitle, TopbarNewButton } from "@/components/layout/topbar";
import { useModal } from "@/hooks/use-modal-store";
import { useSession } from "next-auth/react";
import { MarkdownPreview } from "@/components/editor/markdown-preview";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FavoriteButton } from "@/components/prompts/favorite-button";

// ── helper: highlight {{variables}} in prompt content ──────────────────────
function renderContentWithVariables(content: string) {
  const parts = content.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) =>
    /^\{\{[^}]+\}\}$/.test(part)
      ? (
        <span
          key={i}
          className="bg-accent-100 text-accent-700 rounded-[4px] px-1 font-mono text-[12px]"
        >
          {part}
        </span>
      )
      : <span key={i}>{part}</span>
  );
}

export default function PromptPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const [prompt, setPrompt] = useState<(Prompt & { tags: Tag[], versions: PromptVersion[] }) | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [promptId, setPromptId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("Text");
  const [tags, setTags] = useState<string[]>([]);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("edit");
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<Draft | null>(null);
  const debouncedContent = useDebounce(content, 500);
  const debouncedDescription = useDebounce(description, 500);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { onOpen } = useModal();
  const { status } = useSession();

  // Auto-save draft hook
  const {
    saveDraft,
    loadDraft,
    clearDraft,
    hasDraft,
    draftStatus,
    lastSaved,
  } = useAutoSaveDraft({
    promptId: isCreateMode ? null : promptId,
    isNew: isCreateMode,
    enabled: true,
  });

  const languageOptions = ["Markdown", "Text", "JavaScript", "Python", "JSON", "YAML", "XML"];

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      const id = resolvedParams.promptId;
      setPromptId(id);
      setIsCreateMode(id === "new");
    };
    initializeParams();
  }, [params]);

  // Check authentication status
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (!promptId || status !== "authenticated") return;

    if (isCreateMode) {
      // Initialize empty state for new prompt
      setPrompt(null);
      setContent("");
      setTitle("");
      setDescription("");

      // Initialize tags from query parameter if provided
      const tagsParam = searchParams.get('tags');
      const initialTags = tagsParam ? tagsParam.split(',').map(tag => tag.trim()) : [];
      setTags(initialTags);

      setIsLoading(false);

      // Check for draft (only show if it's less than 24 hours old, at least 30 seconds old, and has meaningful content)
      if (hasDraft) {
        const draft = loadDraft();
        if (draft) {
          const draftAge = Date.now() - draft.timestamp;
          const oneDayInMs = 24 * 60 * 60 * 1000;
          const minDraftAgeMs = 30 * 1000; // 30 seconds - prevents showing recovery while actively typing
          const totalContentLength = draft.content.trim().length + draft.title.trim().length + draft.description.trim().length;
          const hasMeaningfulContent = totalContentLength >= 10; // At least 10 characters total

          // Only show recovery if draft is old enough (not actively being typed) and has meaningful content
          if (draftAge >= minDraftAgeMs && draftAge < oneDayInMs && hasMeaningfulContent) {
            setRecoveredDraft(draft);
            setShowDraftRecovery(true);
          } else if (draftAge >= oneDayInMs) {
            // Clear old drafts (over 24 hours)
            clearDraft();
          }
          // Note: Don't clear fresh drafts (< 30 seconds) - let them continue auto-saving
        }
      }
      return;
    }

    const fetchPrompt = async () => {
      try {
        const fetchedPrompt = await getPromptById(promptId);
        setPrompt(fetchedPrompt as (Prompt & { tags: Tag[], versions: PromptVersion[] }) | null);
        setContent(fetchedPrompt?.content || "");
        setTitle(fetchedPrompt?.title || "");
        setDescription(fetchedPrompt?.description || "");
        setTags(fetchedPrompt?.tags?.map(tag => tag.name) || []);

        // Update lastUsedAt timestamp
        if (fetchedPrompt) {
          updatePromptLastUsed(promptId).catch(console.error);

          // Check for draft after loading prompt
          if (hasDraft) {
            const draft = loadDraft();
            if (draft) {
              const hasSignificantChanges = (
                draft.content !== fetchedPrompt.content ||
                draft.title !== fetchedPrompt.title ||
                draft.description !== fetchedPrompt.description
              );
              const draftAge = Date.now() - draft.timestamp;
              const oneDayInMs = 24 * 60 * 60 * 1000;
              const minDraftAgeMs = 30 * 1000; // 30 seconds - prevents showing recovery while actively typing

              // Only show recovery if draft is old enough, has significant changes, and is not too old
              if (hasSignificantChanges && draftAge >= minDraftAgeMs && draftAge < oneDayInMs) {
                setRecoveredDraft(draft);
                setShowDraftRecovery(true);
              } else if (draftAge >= oneDayInMs) {
                // Clear old drafts (over 24 hours)
                clearDraft();
              }
              // Note: Don't clear fresh drafts (< 30 seconds) - let them continue auto-saving
            }
          }
        }
      } catch (error) {
        console.error('Error fetching prompt:', error);
        // Handle errors by redirecting to prompts page
        router.push('/prompts');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrompt();
  }, [promptId, isCreateMode, status, router, hasDraft, loadDraft, clearDraft, searchParams]);

  // Auto-save draft on content changes
  useEffect(() => {
    saveDraft({
      content,
      title,
      description,
      tags,
    });
  }, [content, title, description, tags, saveDraft]);

  useEffect(() => {
    if (!promptId || isCreateMode || debouncedContent === prompt?.content) return;

    updatePrompt(promptId, { content: debouncedContent });
  }, [debouncedContent, promptId, prompt?.content, isCreateMode]);

  useEffect(() => {
    if (!promptId || isCreateMode || debouncedDescription === prompt?.description) return;

    updatePrompt(promptId, { description: debouncedDescription });
  }, [debouncedDescription, promptId, prompt?.description, isCreateMode]);

  const handleSaveNewPrompt = async () => {
    if (!title.trim()) {
      alert("Please enter a title for the prompt");
      return;
    }

    setIsSaving(true);
    try {
      // Get folderId from query parameter first, then fallback to localStorage
      let folderId = searchParams.get('folderId') || null;

      if (!folderId) {
        const savedFolder = localStorage.getItem('selectedFolder');
        if (savedFolder) {
          try {
            const parsedFolder = JSON.parse(savedFolder);
            folderId = parsedFolder.id;
          } catch (error) {
            console.error('Error parsing saved folder:', error);
          }
        }
      }

      const newPrompt = await createPrompt({
        title: title.trim(),
        content,
        description: description.trim() || undefined,
        folderId: folderId || undefined,
        tags,
      });

      // Clear draft after successful creation
      clearDraft();

      // Navigate to the newly created prompt
      router.push(`/prompts/${newPrompt.id}`);
    } catch (error) {
      console.error('Error creating prompt:', error);
      alert('Failed to create prompt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    router.push('/prompts');
  };

  const handleSave = async () => {
    if (isCreateMode) {
      await handleSaveNewPrompt();
    } else if (promptId) {
      onOpen("saveVersion", {
        promptData: { id: promptId, content, title, description },
        onSuccess: async () => {
          try {
            const fetchedPrompt = await getPromptById(promptId);
            setPrompt(fetchedPrompt as (Prompt & { tags: Tag[], versions: PromptVersion[] }) | null);
          } catch (error) {
            console.error('Error refreshing prompt after save:', error);
          }
        },
      });
    }
  };

  const handleRestore = async () => {
    if (!promptId) return;
    try {
      const fetchedPrompt = await getPromptById(promptId);
      setPrompt(fetchedPrompt as (Prompt & { tags: Tag[], versions: PromptVersion[] }) | null);
      setContent(fetchedPrompt?.content || "");
    } catch (error) {
      console.error('Error restoring prompt:', error);
      alert('Failed to restore prompt version. Please try again.');
    }
  };

  const handleTagsChange = async (newTags: string[]) => {
    setTags(newTags);
    if (!isCreateMode && promptId) {
      // Update tags in real-time for edit mode
      await updatePrompt(promptId, { tags: newTags });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleCopyAsMarkdown = async () => {
    try {
      // Format the prompt as markdown
      const markdownContent = `# ${title}

${description ? `> ${description}\n\n` : ''}## Prompt

\`\`\`${selectedLanguage.toLowerCase()}
${content}
\`\`\`

${tags.length > 0 ? `\n## Tags\n\n${tags.map(tag => `- ${tag}`).join('\n')}` : ''}

---
*Created with [PromptForge](${window.location.origin})*`;

      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy as markdown:", error);
    }
  };

  // Show loading state while checking authentication or loading prompt
  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (status === "unauthenticated") {
    return null;
  }

  if (!promptId || (!prompt && !isCreateMode)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // ── Create mode: keep the original editor layout ──────────────────────────
  if (isCreateMode) {
    return (
      <div className="flex h-full">
        <div className="flex-grow flex flex-col">
          {/* Header */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-4">
              <Button onClick={handleBack} variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Input
                placeholder="Enter prompt title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-grow text-lg font-semibold"
              />
              <Button
                onClick={handleSaveNewPrompt}
                disabled={isSaving || !title.trim()}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Creating..." : "Create Prompt"}
              </Button>
            </div>
          </div>

          {/* Description */}
          <div className="h-36 p-4 border-b">
            <textarea
              placeholder="Enter prompt description (optional)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={256}
              className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
            <div className="text-xs text-gray-500 mt-2 text-right">
              {description.length}/256 characters
            </div>
          </div>

          {/* Language toolbar */}
          <div className="p-3 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Language:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      {selectedLanguage}
                      <ChevronDown className="ml-2 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-white">
                    {languageOptions.map((language) => (
                      <DropdownMenuItem key={language} onClick={() => setSelectedLanguage(language)}>
                        {language}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <SaveStatusIndicator status={draftStatus} lastSaved={lastSaved} onClear={clearDraft} />
            </div>
          </div>

          {/* Editor */}
          <div className="flex-grow overflow-hidden">
            <EditorWithHistory value={content} onChange={setContent} language={selectedLanguage} />
          </div>
        </div>

        {/* Tags sidebar */}
        <div className="w-96 border-l flex flex-col">
          <div className="h-32 p-4 border-b">
            <label className="text-sm font-medium mb-2 block">Tags</label>
            <EnhancedTagInput selectedTags={tags} onTagsChange={handleTagsChange} placeholder="Add tags..." />
          </div>
        </div>

        {/* Draft Recovery Dialog */}
        {recoveredDraft && (
          <DraftRecoveryDialog
            draft={recoveredDraft}
            currentData={{
              title: prompt?.title || title,
              content: prompt?.content || content,
              description: prompt?.description || description,
              tags: prompt?.tags?.map(t => t.name) || tags,
            }}
            open={showDraftRecovery}
            onOpenChange={setShowDraftRecovery}
            onRecover={() => {
              setTitle(recoveredDraft.title);
              setContent(recoveredDraft.content);
              setDescription(recoveredDraft.description);
              setTags(recoveredDraft.tags);
              clearDraft();
            }}
            onDiscard={() => { clearDraft(); }}
          />
        )}
      </div>
    );
  }

  // ── View/Edit mode: Structured Pro detail layout ──────────────────────────

  // Derived values
  const versionCount = prompt?.versions?.length ?? 0;
  const favoriteCount = (prompt as (Prompt & { tags: Tag[]; versions: PromptVersion[]; favorites?: unknown[] }) | null)?.favorites?.length ?? 0;
  const variables = content
    ? [...new Set([...content.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1]))]
    : [];

  return (
    <div className="flex flex-col h-full bg-surface-app">
      {/* ── Topbar (portal into app shell) ── */}
      <TopbarPortal>
        <div className="flex items-center gap-1.5 text-[13px]">
          <Link href="/prompts" className="text-ink-400 hover:text-ink-700">My Prompts</Link>
          <span className="text-ink-300">/</span>
          <span className="font-[550] text-ink-900">{title || "Untitled"}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {promptId && (
            <FavoriteButton
              promptId={promptId}
              isFavorited={false}
              size="sm"
              variant="ghost"
              className="text-ink-400 hover:text-star"
            />
          )}
          <button
            className="border border-line-200 bg-surface-card rounded-[7px] px-3 py-[7px] text-[12.5px] font-[550] text-ink-700 hover:bg-surface-muted"
            onClick={() =>
              onOpen("sharePrompt", {
                promptData: { id: promptId!, title, description, content },
              })
            }
          >
            Share
          </button>
          <TopbarNewButton label={isSaving ? "Saving…" : "Edit"} icon={false} onClick={handleSave} />
        </div>
      </TopbarPortal>

      {/* ── Body: two-column grid ── */}
      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="grid grid-cols-[1fr_300px] gap-6 max-w-[1200px] mx-auto">

          {/* LEFT COLUMN */}
          <div className="min-w-0">

            {/* Title card */}
            <div className="bg-surface-card border border-line-200 rounded-[11px] p-5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[21px] font-[660] tracking-[-0.02em] text-ink-900 leading-tight">
                  {title || "Untitled Prompt"}
                </h1>
                {versionCount > 0 && (
                  <span className="bg-accent-100 text-accent-700 rounded-full text-[10px] px-2 py-0.5 font-[600] shrink-0">
                    v{versionCount}
                  </span>
                )}
              </div>

              {description && (
                <p className="text-ink-600 text-sm mt-2 leading-relaxed">{description}</p>
              )}

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-[#F1F2F5] text-ink-600 rounded-full text-[10px] px-2 py-0.5"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Prompt content card */}
            <div className="bg-surface-card border border-line-200 rounded-[11px] p-5 mt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-[620] text-ink-900">Prompt content</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-[7px] border-line-200 text-ink-700 text-[11px] h-7 px-2.5 gap-1"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <div className="font-mono text-[12.5px] text-ink-700 whitespace-pre-wrap leading-relaxed bg-surface-muted rounded-[7px] p-4 border border-line-100">
                {content ? renderContentWithVariables(content) : (
                  <span className="text-ink-400 italic">No content yet.</span>
                )}
              </div>
            </div>

            {/* Variables card */}
            <div className="bg-surface-card border border-line-200 rounded-[11px] p-5 mt-4">
              <span className="text-[13px] font-[620] text-ink-900 block mb-3">Variables</span>
              {variables.length > 0 ? (
                <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                  {variables.map((varName) => (
                    <div key={varName} className="flex items-center justify-between">
                      <span className="font-mono text-ink-700 text-[12.5px]">{`{{${varName}}}`}</span>
                      <span className="text-ink-400 text-[11px]">text</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-ink-400 text-sm">No variables detected</p>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN (rail) */}
          <div className="shrink-0">

            {/* Usage stats card */}
            <div className="bg-surface-card border border-line-200 rounded-[11px] p-5">
              <div className="grid grid-cols-2 gap-4">
                {/* Uses */}
                <div>
                  <p className="tabular-nums text-[24px] font-[660] text-ink-900 leading-none">
                    {(prompt as (Prompt & { tags: Tag[]; versions: PromptVersion[] }) | null)?.usageCount ?? 0}
                  </p>
                  <p className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400 mt-1">Uses</p>
                </div>

                {/* Rating */}
                <div>
                  <p className="tabular-nums text-[24px] font-[660] text-ink-900 leading-none flex items-center gap-1">
                    {(prompt as (Prompt & { tags: Tag[]; versions: PromptVersion[] }) | null)?.averageRating
                      ? ((prompt as (Prompt & { tags: Tag[]; versions: PromptVersion[] })).averageRating as number).toFixed(1)
                      : "—"}
                    <Star className="h-4 w-4 text-star fill-current" />
                  </p>
                  <p className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400 mt-1">Rating</p>
                </div>

                {/* Versions */}
                <div>
                  <p className="tabular-nums text-[24px] font-[660] text-ink-900 leading-none">
                    {versionCount}
                  </p>
                  <p className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400 mt-1">Versions</p>
                </div>

                {/* Favorites */}
                <div>
                  <p className="tabular-nums text-[24px] font-[660] text-ink-900 leading-none">
                    {favoriteCount}
                  </p>
                  <p className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400 mt-1">Favorites</p>
                </div>
              </div>
            </div>

            {/* Version history card */}
            {prompt && prompt.versions && prompt.versions.length > 0 && (
              <div className="bg-surface-card border border-line-200 rounded-[11px] p-5 mt-4">
                <span className="text-[13px] font-[620] text-ink-900 block mb-4">Version history</span>

                <div className="relative">
                  {/* Vertical connecting line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-line-150" />

                  <div className="flex flex-col gap-3">
                    {prompt.versions.map((ver, idx) => {
                      const isLatest = idx === 0;
                      return (
                        <div
                          key={ver.id}
                          className={`relative flex gap-3 rounded-[7px] p-2 -mx-2 ${
                            isLatest ? "bg-accent-100" : ""
                          }`}
                        >
                          {/* Dot */}
                          <div
                            className={`shrink-0 w-[15px] h-[15px] rounded-full border-2 mt-0.5 z-10 ${
                              isLatest
                                ? "bg-accent-500 border-accent-500"
                                : "bg-surface-card border-line-200"
                            }`}
                          />

                          {/* Version info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono text-[11px] font-[600] ${
                                  isLatest ? "text-accent-700" : "text-ink-700"
                                }`}
                              >
                                {ver.version
                                  ? (String(ver.version).startsWith("v") ? ver.version : `v${ver.version}`)
                                  : `#${prompt.versions.length - idx}`}
                              </span>
                              {isLatest && (
                                <span className="bg-accent-100 text-accent-700 rounded-full text-[9px] px-1.5 py-0.5 font-[600]">
                                  current
                                </span>
                              )}
                            </div>

                            {ver.changeMessage && (
                              <p className="text-ink-700 text-[12px] mt-0.5 leading-snug truncate">
                                {ver.changeMessage}
                              </p>
                            )}

                            <p className="text-ink-400 text-[11px] mt-0.5">
                              {new Date(ver.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Save-status indicator (subtle, below version history) */}
            <div className="mt-3 flex justify-end">
              <SaveStatusIndicator status={draftStatus} lastSaved={lastSaved} onClear={clearDraft} />
            </div>
          </div>
        </div>
      </div>

      {/* Draft Recovery Dialog */}
      {recoveredDraft && (
        <DraftRecoveryDialog
          draft={recoveredDraft}
          currentData={{
            title: prompt?.title || title,
            content: prompt?.content || content,
            description: prompt?.description || description,
            tags: prompt?.tags?.map(t => t.name) || tags,
          }}
          open={showDraftRecovery}
          onOpenChange={setShowDraftRecovery}
          onRecover={() => {
            setTitle(recoveredDraft.title);
            setContent(recoveredDraft.content);
            setDescription(recoveredDraft.description);
            setTags(recoveredDraft.tags);
            clearDraft();
          }}
          onDiscard={() => {
            clearDraft();
          }}
        />
      )}
    </div>
  );
}
