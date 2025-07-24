"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiffViewer } from "./diff-viewer";
import { GitCompare, FileText, Tag, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { DiffMode } from "@/lib/diff-utils";

interface PromptData {
  id: string;
  title: string;
  content: string;
  description?: string | null;
  tags?: Array<{ id: string; name: string }>;
  createdAt?: Date;
  updatedAt?: Date;
  version?: string | null;
}

interface PromptDiffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leftPrompt: PromptData;
  rightPrompt: PromptData;
  leftTitle?: string;
  rightTitle?: string;
}

export function PromptDiffModal({
  open,
  onOpenChange,
  leftPrompt,
  rightPrompt,
  leftTitle,
  rightTitle,
}: PromptDiffModalProps) {
  const [diffMode, setDiffMode] = useState<DiffMode>("side-by-side");
  const [showMetadata, setShowMetadata] = useState(false);

  // Compute tag differences
  const leftTags = leftPrompt.tags?.map(t => t.name) || [];
  const rightTags = rightPrompt.tags?.map(t => t.name) || [];
  const addedTags = rightTags.filter(tag => !leftTags.includes(tag));
  const removedTags = leftTags.filter(tag => !rightTags.includes(tag));
  const commonTags = leftTags.filter(tag => rightTags.includes(tag));

  const hasMetadataChanges = 
    leftPrompt.title !== rightPrompt.title ||
    leftPrompt.description !== rightPrompt.description ||
    addedTags.length > 0 ||
    removedTags.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare Prompts
          </DialogTitle>
          <DialogDescription>
            Comparing changes between two versions
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <Tabs value={diffMode} onValueChange={(v) => setDiffMode(v as DiffMode)}>
              <TabsList>
                <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
                <TabsTrigger value="inline">Inline</TabsTrigger>
                <TabsTrigger value="unified">Unified</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant={showMetadata ? "default" : "outline"}
              size="sm"
              onClick={() => setShowMetadata(!showMetadata)}
            >
              Metadata
              {hasMetadataChanges && (
                <Badge variant="destructive" className="ml-2 h-4 px-1 text-xs">
                  Changed
                </Badge>
              )}
            </Button>
          </div>

          {/* Metadata Diff */}
          {showMetadata && (
            <div className="border rounded-lg p-4 space-y-3 bg-gray-100">
              {/* Title Changes */}
              {leftPrompt.title !== rightPrompt.title && (
                <div className="space-y-1">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Title
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-red-100 text-red-600 dark:text-red-700 p-2 rounded">
                      - {leftPrompt.title}
                    </div>
                    <div className="bg-green-100 text-green-600 dark:text-green-700 p-2 rounded">
                      + {rightPrompt.title}
                    </div>
                  </div>
                </div>
              )}

              {/* Description Changes */}
              {leftPrompt.description !== rightPrompt.description && (
                <div className="space-y-1">
                  <div className="text-sm font-medium">Description</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-red-100 text-red-600 dark:text-red-700 p-2 rounded">
                      {leftPrompt.description || "(empty)"}
                    </div>
                    <div className="bg-green-100 text-green-600 dark:text-green-700 p-2 rounded">
                      {rightPrompt.description || "(empty)"}
                    </div>
                  </div>
                </div>
              )}

              {/* Tag Changes */}
              {(addedTags.length > 0 || removedTags.length > 0) && (
                <div className="space-y-1">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {removedTags.map(tag => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="bg-red-100 text-red-600 dark:text-red-700 border-red-300"
                      >
                        - {tag}
                      </Badge>
                    ))}
                    {commonTags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                    {addedTags.map(tag => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="bg-green-100 text-green-600 dark:text-green-700 border-green-300"
                      >
                        + {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Left: {leftPrompt.updatedAt 
                      ? formatDistanceToNow(new Date(leftPrompt.updatedAt), { addSuffix: true })
                      : "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Right: {rightPrompt.updatedAt 
                      ? formatDistanceToNow(new Date(rightPrompt.updatedAt), { addSuffix: true })
                      : "Unknown"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Content Diff */}
          <div className="flex-1 overflow-hidden">
            <DiffViewer
              oldContent={leftPrompt.content}
              newContent={rightPrompt.content}
              oldTitle={leftTitle || leftPrompt.title}
              newTitle={rightTitle || rightPrompt.title}
              mode={diffMode}
              className="h-full"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}