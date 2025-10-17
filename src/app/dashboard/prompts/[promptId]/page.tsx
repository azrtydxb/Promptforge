"use client";

import { useEffect, useState } from "react";
import { getPromptByIdRedis as getPromptById } from "@/app/actions/prompt.actions.redis";
import { updatePrompt, createPrompt } from "@/app/actions/prompt.actions";
import { EditorWithHistory } from "@/components/editor/editor-with-history";
import type { Prompt, Tag } from "@/generated/prisma";
import { useDebounce } from "@/hooks/use-debounce";
import { useAutoSaveDraft } from "@/hooks/use-auto-save-draft";
import { SaveStatusIndicator } from "@/components/editor/save-status-indicator";
import { DraftRecoveryDialog } from "@/components/editor/draft-recovery-dialog";
import type { Draft } from "@/services/draft-storage";
import { TagInput } from "@/components/prompts/tag-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Save, ArrowLeft, Eye, Split, Code2, Copy, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { MarkdownPreview } from "@/components/editor/markdown-preview";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PromptPage({
  params,
}: {
  params: Promise<{ promptId: string }>;
}) {
  const [prompt, setPrompt] = useState<(Prompt & { tags: Tag[] }) | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [promptId, setPromptId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("Text");
  const [tags, setTags] = useState<string[]>([]);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview" | "split">("edit");
  const [copied, setCopied] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<Draft | null>(null);
  const debouncedContent = useDebounce(content, 500);
  const debouncedDescription = useDebounce(description, 500);
  const router = useRouter();
  const searchParams = useSearchParams();

  const languageOptions = ["Markdown", "Text", "Yaml", "Json", "XML"];
  
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

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params;
      const id = resolvedParams.promptId;
      setPromptId(id);
      setIsCreateMode(id === "new");
    };
    initializeParams();
  }, [params]);

  useEffect(() => {
    if (!promptId) return;
    
    if (isCreateMode) {
      // Initialize empty state for new prompt
      setPrompt(null);
      setContent("");
      setTitle("");
      setDescription("");
      setTags([]);
      
      // Check for draft
      if (hasDraft) {
        const draft = loadDraft();
        if (draft) {
          setRecoveredDraft(draft);
          setShowDraftRecovery(true);
        }
      }
      return;
    }
    
    const fetchPrompt = async () => {
      const fetchedPrompt = await getPromptById(promptId);
      setPrompt(fetchedPrompt as (Prompt & { tags: Tag[] }) | null);
      setContent(fetchedPrompt?.content || "");
      setTitle(fetchedPrompt?.title || "");
      setDescription(fetchedPrompt?.description || "");
      setTags(fetchedPrompt?.tags?.map(tag => tag.name) || []);
      
      // Check for draft after loading prompt
      if (fetchedPrompt && hasDraft) {
        const draft = loadDraft();
        if (draft && (
          draft.content !== fetchedPrompt.content ||
          draft.title !== fetchedPrompt.title ||
          draft.description !== fetchedPrompt.description
        )) {
          setRecoveredDraft(draft);
          setShowDraftRecovery(true);
        }
      }
    };
    fetchPrompt();
  }, [promptId, isCreateMode, hasDraft, loadDraft]);

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
      const markdownContent = `# ${title || "Untitled Prompt"}

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

  if (!promptId || (!prompt && !isCreateMode)) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-full">
      {/* Main section: Editor taking almost all screen */}
      <div className="flex-grow flex flex-col">
        {/* Title Input for Create Mode */}
        {isCreateMode && (
          <div className="p-4 border-b">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleBack}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Input
                placeholder="Enter prompt title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-grow"
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
        )}

        {/* Description field above language dropdown */}
        <div className="h-32 p-4 border-b">
          <textarea
            placeholder="Enter prompt description (optional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={256}
            className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <div className="text-xs text-gray-500 mt-1 text-right">
            {description.length}/256 characters
          </div>
        </div>

        {/* Language dropdown and view mode toggles */}
        <div className="p-3 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
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
                      <DropdownMenuItem
                        key={language}
                        onClick={() => setSelectedLanguage(language)}
                      >
                        {language}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* View mode toggles - only show for Markdown language */}
              {selectedLanguage === "Markdown" && (
                <div className="flex items-center">
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "edit" | "preview" | "split")}>
                    <TabsList className="h-8">
                      <TabsTrigger value="edit" className="h-7 px-3 text-xs">
                        <Code2 className="h-3 w-3 mr-1" />
                        Edit
                      </TabsTrigger>
                      <TabsTrigger value="split" className="h-7 px-3 text-xs">
                        <Split className="h-3 w-3 mr-1" />
                        Split
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="h-7 px-3 text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <SaveStatusIndicator
                status={draftStatus}
                lastSaved={lastSaved}
                onClear={clearDraft}
              />
              {!isCreateMode && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                            <ChevronDown className="h-3 w-3" />
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white">
                      <DropdownMenuItem onClick={handleCopy}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Content
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopyAsMarkdown}>
                        <Code2 className="h-4 w-4 mr-2" />
                        Copy as Markdown
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    onClick={handleBack}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Editor/Preview taking remaining space */}
        <div className="flex-grow overflow-hidden">
          {viewMode === "edit" && (
            <EditorWithHistory value={content} onChange={setContent} language={selectedLanguage} />
          )}
          {viewMode === "preview" && (
            <div className="h-full overflow-auto bg-gray-900">
              <MarkdownPreview content={content} />
            </div>
          )}
          {viewMode === "split" && (
            <div className="flex h-full">
              <div className="w-1/2 border-r border-gray-700">
                <EditorWithHistory value={content} onChange={setContent} language={selectedLanguage} />
              </div>
              <div className="w-1/2 overflow-auto bg-gray-900">
                <MarkdownPreview content={content} />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Right sidebar: TagInput at top, VersionHistorySidebar below */}
      <div className="w-80 border-l flex flex-col">
        <div className="h-32 p-4 border-b">
          {isCreateMode ? (
            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]"
                  >
                    {tag}
                    <button
                      onClick={() => setTags(tags.filter((_, i) => i !== index))}
                      className="ml-1 text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]/80"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <Input
                  placeholder="Add tag..."
                  className="flex-grow min-w-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = e.currentTarget.value.trim();
                      if (value && !tags.includes(value)) {
                        setTags([...tags, value]);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>
          ) : (
            prompt && <TagInput promptId={prompt.id} initialTags={prompt.tags} />
          )}
        </div>
        {!isCreateMode && prompt && (
          <div className="flex-grow">
            {/* Version history sidebar - to be implemented with proper props */}
            <div className="p-4 text-sm text-muted-foreground">
              Version history coming soon...
            </div>
          </div>
        )}
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