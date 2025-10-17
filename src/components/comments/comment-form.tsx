"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { createComment, updateComment } from "@/app/actions/comments.actions";
import { Send, X, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { CommentFormSubmitResult } from "./types";

interface CommentFormProps {
  sharedPromptId: string;
  parentId?: string;
  editingComment?: {
    id: string;
    content: string;
  };
  onSuccess?: (comment: CommentFormSubmitResult) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function CommentForm({
  sharedPromptId,
  parentId,
  editingComment,
  onSuccess,
  onCancel,
  placeholder = "Write a comment...",
  autoFocus = false,
  className
}: CommentFormProps) {
  const [content, setContent] = useState(editingComment?.content || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setIsSubmitting(true);

    try {
      let result;
      
      if (editingComment) {
        // Update existing comment
        result = await updateComment({
          commentId: editingComment.id,
          content: content.trim()
        });
      } else {
        // Create new comment
        result = await createComment({
          sharedPromptId,
          content: content.trim(),
          parentId
        });
      }

      if (result.success && result.comment) {
        setContent("");
        toast.success(editingComment ? "Comment updated" : "Comment posted");
        if (onSuccess) {
          onSuccess(result.comment);
        }
      } else {
        toast.error(result.error || "Failed to post comment");
      }
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-3", className)}>
      <div className="relative">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="min-h-[100px] resize-none pr-2"
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          disabled={isSubmitting}
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          {content.length}/2000
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Press Ctrl+Enter to submit &bull; Markdown supported
        </div>
        
        <div className="flex items-center gap-2">
          {(onCancel || editingComment) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}

          <LoadingButton
            type="submit"
            size="sm"
            loading={isSubmitting}
            disabled={!content.trim()}
            loadingText="Posting..."
            className="min-w-[80px]"
          >
            {editingComment ? (
              <>
                <Edit3 className="h-4 w-4 mr-1" />
                Update
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Post
              </>
            )}
          </LoadingButton>
        </div>
      </div>
    </form>
  );
}