"use client";

import { useEffect, useState } from "react";
import { getPromptById } from "@/app/actions/prompt.actions";
import { updatePrompt, createPrompt, updatePromptLastUsed } from "@/app/actions/prompt.actions";
import { Editor } from "@/components/editor/editor";
import type { Prompt, Tag, PromptVersion } from "@/generated/prisma";
import { useDebounce } from "@/hooks/use-debounce";
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
import { ChevronDown, Save, ArrowLeft, Copy, Check, Share2, Eye, Split, Code2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useModal } from "@/hooks/use-modal-store";
import { AIEnhancementPanel } from "@/components/prompts/ai-enhancement-panel";
import { useSession } from "next-auth/react";
import { MarkdownPreview } from "@/components/editor/markdown-preview";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const debouncedContent = useDebounce(content, 500);
  const debouncedDescription = useDebounce(description, 500);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { onOpen } = useModal();
  const { status } = useSession();

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
      setTags([]);
      setIsLoading(false);
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
  }, [promptId, isCreateMode, status, router]);

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

  return (
    <div className="flex h-full">
      {/* Main section: Editor taking almost all screen */}
      <div className="flex-grow flex flex-col">
        {/* Unified Header */}
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
              className="flex-grow text-lg font-semibold"
            />
            {!isCreateMode && (
              <Button
                onClick={() => onOpen("sharePrompt", { 
                  promptData: { 
                    id: promptId!, 
                    title, 
                    description,
                    content 
                  } 
                })}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            )}
            <Button
              onClick={isCreateMode ? handleSaveNewPrompt : handleSave}
              disabled={isSaving || !title.trim()}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isCreateMode
                ? isSaving
                  ? "Creating..."
                  : "Create Prompt"
                : isSaving
                ? "Saving..."
                : "Save"}
            </Button>
          </div>
        </div>

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
                  <DropdownMenuContent align="start">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                        <ChevronDown className="h-3 w-3" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
              {!isCreateMode && prompt?.versions?.[0]?.version && (
                <span className="text-sm text-gray-500">
                  Version: {prompt.versions[0].version}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Editor/Preview taking remaining space */}
        <div className="flex-grow overflow-hidden">
          {viewMode === "edit" && (
            <Editor value={content} onChange={setContent} language={selectedLanguage} />
          )}
          {viewMode === "preview" && (
            <div className="h-full overflow-auto bg-gray-900">
              <MarkdownPreview content={content} />
            </div>
          )}
          {viewMode === "split" && (
            <div className="flex h-full">
              <div className="w-1/2 border-r border-gray-700">
                <Editor value={content} onChange={setContent} language={selectedLanguage} />
              </div>
              <div className="w-1/2 overflow-auto bg-gray-900">
                <MarkdownPreview content={content} />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Right sidebar: TagInput at top, PromptHistoryTimeline below */}
      <div className="w-96 border-l flex flex-col">
        <div className="h-32 p-4 border-b">
          <div>
            <label className="text-sm font-medium mb-2 block">Tags</label>
            <EnhancedTagInput
              selectedTags={tags}
              onTagsChange={handleTagsChange}
              placeholder="Add tags..."
            />
          </div>
        </div>
        {!isCreateMode && prompt && (
          <div className="flex-grow overflow-y-auto">
            <div className="p-4 border-b">
              <AIEnhancementPanel
                promptId={promptId!}
                currentContent={content}
                currentTags={tags}
                onTagsUpdate={handleTagsChange}
                onContentUpdate={(newContent) => {
                  setContent(newContent);
                  updatePrompt(promptId!, { content: newContent });
                }}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PromptHistoryTimeline 
                promptId={promptId!} 
                currentContent={content}
                onRestore={handleRestore}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}