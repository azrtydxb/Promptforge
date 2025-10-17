"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Share2 } from "lucide-react";

interface PromptHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  onBack: () => void;
  onSave: () => void;
  onShare?: () => void;
  isSaving: boolean;
  isCreateMode: boolean;
  showShareButton?: boolean;
}

export function PromptHeader({
  title,
  onTitleChange,
  onBack,
  onSave,
  onShare,
  isSaving,
  isCreateMode,
  showShareButton = true
}: PromptHeaderProps) {
  return (
    <div className="p-4 border-b">
      <div className="flex items-center gap-4">
        <Button
          onClick={onBack}
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
          onChange={(e) => onTitleChange(e.target.value)}
          className="flex-grow text-lg font-semibold"
        />
        {!isCreateMode && showShareButton && onShare && (
          <Button
            onClick={onShare}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        )}
        <Button
          onClick={onSave}
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
  );
}
