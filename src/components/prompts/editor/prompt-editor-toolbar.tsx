"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Copy, Check, Code2, Eye, Split } from "lucide-react";
import { SaveStatusIndicator } from "@/components/editor/save-status-indicator";

interface PromptEditorToolbarProps {
  selectedLanguage: string;
  languageOptions: string[];
  onLanguageChange: (language: string) => void;
  viewMode: "edit" | "preview" | "split";
  onViewModeChange: (mode: "edit" | "preview" | "split") => void;
  draftStatus: "idle" | "saving" | "saved";
  lastSaved: Date | null;
  onClearDraft: () => void;
  onCopy: () => void;
  onCopyAsMarkdown: () => void;
  copied: boolean;
  version?: number;
  showMarkdownToggle?: boolean;
}

export function PromptEditorToolbar({
  selectedLanguage,
  languageOptions,
  onLanguageChange,
  viewMode,
  onViewModeChange,
  draftStatus,
  lastSaved,
  onClearDraft,
  onCopy,
  onCopyAsMarkdown,
  copied,
  version,
  showMarkdownToggle = true
}: PromptEditorToolbarProps) {
  return (
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
                    onClick={() => onLanguageChange(language)}
                  >
                    {language}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* View mode toggles - only show for Markdown language */}
          {showMarkdownToggle && selectedLanguage === "Markdown" && (
            <div className="flex items-center">
              <Tabs
                value={viewMode}
                onValueChange={(v) =>
                  onViewModeChange(v as "edit" | "preview" | "split")
                }
              >
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
            onClear={onClearDraft}
          />
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
            <DropdownMenuContent align="end" className="bg-white">
              <DropdownMenuItem onClick={onCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Content
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onCopyAsMarkdown}>
                <Code2 className="h-4 w-4 mr-2" />
                Copy as Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {version && (
            <span className="text-sm text-gray-500">Version: {version}</span>
          )}
        </div>
      </div>
    </div>
  );
}
