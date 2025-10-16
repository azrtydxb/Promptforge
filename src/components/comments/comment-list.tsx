"use client";

import { useState, useEffect, useCallback } from "react";
import { CommentItem } from "./comment-item";
import { CommentForm } from "./comment-form";
import { getComments } from "@/app/actions/comments.actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquareText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Comment, CommentFormSubmitResult } from "./types";

interface CommentListProps {
  sharedPromptId: string;
  promptAuthorId?: string;
  initialComments?: Comment[];
  commentCount?: number;
}

export function CommentList({
  sharedPromptId,
  promptAuthorId,
  initialComments = [],
  commentCount = 0
}: CommentListProps) {
  const [comments, setComments] = useState(initialComments);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "mostLiked">("newest");
  const [pagination, setPagination] = useState({
    page: 1,
    hasNext: false,
    total: commentCount
  });

  const loadComments = useCallback(async (page = 1, append = false) => {
    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const result = await getComments({
        sharedPromptId,
        page,
        sortBy
      });

      if (result.success && result.comments) {
        if (append) {
          setComments(prev => [...prev, ...result.comments]);
        } else {
          setComments(result.comments);
        }

        if (result.pagination) {
          setPagination({
            page: result.pagination.page,
            hasNext: result.pagination.hasNext,
            total: result.pagination.total
          });
        }
      } else {
        toast.error("Failed to load comments");
      }
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [sharedPromptId, sortBy]);

  // Load comments when sort changes
  useEffect(() => {
    if (initialComments.length === 0 && commentCount > 0) {
      loadComments();
    }
  }, [sortBy, initialComments.length, commentCount, loadComments]);

  const handleCommentAdded = (newComment: CommentFormSubmitResult) => {
    // Add comment to the beginning of the list
    const formattedComment: Comment = {
      ...newComment,
      createdAt: new Date(newComment.createdAt),
      updatedAt: new Date(newComment.updatedAt),
      replies: []
    };
    setComments(prev => [formattedComment, ...prev]);
    setPagination(prev => ({
      ...prev,
      total: prev.total + 1
    }));
  };

  const handleReplyAdded = (reply: CommentFormSubmitResult) => {
    // Update the parent comment with the new reply
    setComments(prev => prev.map(comment => {
      if (reply.parentId && comment.id === reply.parentId) {
        const formattedReply: Comment = {
          ...reply,
          createdAt: new Date(reply.createdAt),
          updatedAt: new Date(reply.updatedAt),
          replies: []
        };
        return {
          ...comment,
          replies: [...(comment.replies || []), formattedReply],
          _count: {
            ...comment._count,
            replies: (comment._count?.replies || 0) + 1
          }
        };
      }
      return comment;
    }));
  };

  const handleCommentUpdated = (updatedComment: CommentFormSubmitResult) => {
    setComments(prev => prev.map(comment =>
      comment.id === updatedComment.id
        ? {
            ...comment,
            content: updatedComment.content,
            updatedAt: new Date(updatedComment.updatedAt)
          }
        : comment
    ));
  };

  const handleCommentDeleted = (commentId: string) => {
    setComments(prev => prev.filter(comment => comment.id !== commentId));
    setPagination(prev => ({
      ...prev,
      total: Math.max(0, prev.total - 1)
    }));
  };

  const handleLoadMore = () => {
    loadComments(pagination.page + 1, true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-[#546ee5]" />
          <h3 className="text-lg font-semibold">
            Comments ({pagination.total})
          </h3>
        </div>

        {comments.length > 0 && (
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as "newest" | "oldest" | "mostLiked")}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="mostLiked">Most liked</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Comment Form */}
      <CommentForm
        sharedPromptId={sharedPromptId}
        onSuccess={handleCommentAdded}
        placeholder="Share your thoughts about this prompt..."
      />

      {/* Comments */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquareText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No comments yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                sharedPromptId={sharedPromptId}
                onReplySuccess={handleReplyAdded}
                onEditSuccess={handleCommentUpdated}
                onDeleteSuccess={handleCommentDeleted}
                isPromptAuthor={promptAuthorId}
              />
            ))}
          </div>

          {/* Load More */}
          {pagination.hasNext && (
            <div className="text-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more comments"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}