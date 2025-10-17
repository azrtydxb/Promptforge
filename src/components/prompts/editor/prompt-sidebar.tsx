"use client";

import { ReactNode } from "react";
import { EnhancedTagInput } from "@/components/prompts/enhanced-tag-input";

interface PromptSidebarProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  children?: ReactNode;
}

export function PromptSidebar({
  tags,
  onTagsChange,
  children
}: PromptSidebarProps) {
  return (
    <div className="w-96 border-l flex flex-col">
      <div className="h-32 p-4 border-b">
        <div>
          <label className="text-sm font-medium mb-2 block">Tags</label>
          <EnhancedTagInput
            selectedTags={tags}
            onTagsChange={onTagsChange}
            placeholder="Add tags..."
          />
        </div>
      </div>
      {children && (
        <div className="flex-grow overflow-y-auto">
          {children}
        </div>
      )}
    </div>
  );
}
