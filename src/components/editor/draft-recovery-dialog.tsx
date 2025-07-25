"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { FileText, Clock, Tag } from "lucide-react";
import type { Draft } from "@/services/draft-storage";

interface DraftRecoveryDialogProps {
  draft: Draft;
  currentData?: {
    title?: string;
    content?: string;
    description?: string;
    tags?: string[];
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecover: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryDialog({
  draft,
  currentData,
  open,
  onOpenChange,
  onRecover,
  onDiscard,
}: DraftRecoveryDialogProps) {
  const [showComparison, setShowComparison] = useState(false);

  const hasChanges = currentData && (
    currentData.title !== draft.title ||
    currentData.content !== draft.content ||
    currentData.description !== draft.description ||
    JSON.stringify(currentData.tags || []) !== JSON.stringify(draft.tags)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Draft Recovery Available</DialogTitle>
          <DialogDescription>
            We found an unsaved draft from{" "}
            {formatDistanceToNow(new Date(draft.timestamp), { addSuffix: true })}.
            Would you like to recover it?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Draft Preview */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-1">
                <h4 className="font-medium">
                  {draft.title || "Untitled Prompt"}
                </h4>
                {draft.description && (
                  <p className="text-sm text-muted-foreground">
                    {draft.description}
                  </p>
                )}
              </div>
            </div>

            {draft.content && (
              <ScrollArea className="h-32 w-full rounded border bg-gray-100 p-3">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {draft.content.slice(0, 500)}
                  {draft.content.length > 500 && "..."}
                </pre>
              </ScrollArea>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(draft.timestamp), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {draft.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  <span>{draft.tags.length} tags</span>
                </div>
              )}
            </div>

            {draft.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {draft.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {hasChanges && (
            <div className="rounded-lg bg-amber-100 border border-amber-300 p-3">
              <p className="text-sm text-amber-600">
                Warning: The current prompt has unsaved changes that will be
                overwritten if you recover this draft.
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
                className="mt-1 h-auto p-0 text-amber-600"
              >
                {showComparison ? "Hide" : "Show"} differences
              </Button>
            </div>
          )}

          {showComparison && hasChanges && (
            <div className="space-y-2 text-sm">
              {currentData?.title !== draft.title && (
                <div>
                  <span className="font-medium">Title:</span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="rounded border p-2 bg-red-50">
                      <span className="text-xs text-muted-foreground">Current:</span>
                      <p>{currentData?.title || "Untitled"}</p>
                    </div>
                    <div className="rounded border p-2 bg-green-50">
                      <span className="text-xs text-muted-foreground">Draft:</span>
                      <p>{draft.title || "Untitled"}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onDiscard();
              onOpenChange(false);
            }}
          >
            Discard Draft
          </Button>
          <Button
            onClick={() => {
              onRecover();
              onOpenChange(false);
            }}
          >
            Recover Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}