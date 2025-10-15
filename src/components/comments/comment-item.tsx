"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CommentForm } from "./comment-form";
import { deleteComment, toggleCommentLike } from "@/app/actions/comments.actions";
import { 
  Heart, 
  MessageSquare, 
  MoreHorizontal, 
  Edit3, 
  Trash2,
  Flag,
  ChevronDown,
  ChevronUp,
  Shield
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CommentItemProps {
  comment: {
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    likeCount?: number;
    isLiked?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    user: {
      id: string;
      username: string | null;
      name: string | null;
      avatarType: string;
      profilePicture: string | null;
      reputationScore?: number;
    };
    replies?: CommentItemProps["comment"][];
    _count?: {
      replies: number;
    };
  };
  sharedPromptId: string;
  onReplySuccess?: (reply: any) => void;
  onEditSuccess?: (comment: any) => void;
  onDeleteSuccess?: (commentId: string) => void;
  level?: number;
  isPromptAuthor?: boolean;
}

export function CommentItem({
  comment,
  sharedPromptId,
  onReplySuccess,
  onEditSuccess,
  onDeleteSuccess,
  level = 0,
  isPromptAuthor = false
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [localLikeState, setLocalLikeState] = useState({
    isLiked: comment.isLiked || false,
    likeCount: comment.likeCount || 0
  });

  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    // Optimistic update
    setLocalLikeState(prev => ({
      isLiked: !prev.isLiked,
      likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1
    }));

    try {
      const result = await toggleCommentLike(comment.id);
      
      if (result.success) {
        setLocalLikeState({
          isLiked: result.isLiked,
          likeCount: result.likeCount
        });
      } else {
        // Revert on error
        setLocalLikeState({
          isLiked: comment.isLiked || false,
          likeCount: comment.likeCount || 0
        });
        toast.error("Failed to like comment");
      }
    } catch (error) {
      // Revert on error
      setLocalLikeState({
        isLiked: comment.isLiked || false,
        likeCount: comment.likeCount
      });
      toast.error("Failed to like comment");
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const result = await deleteComment(comment.id);
      
      if (result.success) {
        toast.success("Comment deleted");
        if (onDeleteSuccess) {
          onDeleteSuccess(comment.id);
        }
      } else {
        toast.error(result.error || "Failed to delete comment");
      }
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const handleEditSuccess = (updatedComment: any) => {
    setIsEditing(false);
    if (onEditSuccess) {
      onEditSuccess(updatedComment);
    }
  };

  const userDisplayName = comment.user.name || comment.user.username || "Anonymous";
  const userInitials = userDisplayName.slice(0, 2).toUpperCase();
  const hasReplies = comment.replies && comment.replies.length > 0;
  const replyCount = comment._count?.replies || 0;

  return (
    <div className={cn("group", level > 0 && "ml-12")}>
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          {comment.user.profilePicture && (
            <AvatarImage src={comment.user.profilePicture} alt={userDisplayName} />
          )}
          <AvatarFallback>{userInitials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{userDisplayName}</span>
              {comment.user.reputationScore && comment.user.reputationScore > 100 && (
                <Shield className="h-3 w-3 text-[#546ee5]" title={`Reputation: ${comment.user.reputationScore}`} />
              )}
              {isPromptAuthor && comment.user.id === isPromptAuthor && (
                <span className="text-xs bg-[#546ee5] text-white px-1.5 py-0.5 rounded">Author</span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
              {comment.updatedAt !== comment.createdAt && (
                <span className="text-xs text-muted-foreground">(edited)</span>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                {comment.canEdit && (
                  <>
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {comment.canDelete && (
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
                {!comment.canEdit && !comment.canDelete && (
                  <DropdownMenuItem>
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content */}
          {isEditing ? (
            <CommentForm
              sharedPromptId={sharedPromptId}
              editingComment={{
                id: comment.id,
                content: comment.content
              }}
              onSuccess={handleEditSuccess}
              onCancel={() => setIsEditing(false)}
              autoFocus
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {comment.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-2 gap-1.5",
                  localLikeState.isLiked && "text-red-500"
                )}
                onClick={handleLike}
                disabled={isLiking}
              >
                <Heart className={cn(
                  "h-4 w-4",
                  localLikeState.isLiked && "fill-current"
                )} />
                <span className="text-xs">{localLikeState.likeCount}</span>
              </Button>

              {level < 2 && ( // Limit nesting depth
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1.5"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs">Reply</span>
                </Button>
              )}

              {hasReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1.5"
                  onClick={() => setShowReplies(!showReplies)}
                >
                  {showReplies ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span className="text-xs">
                    {replyCount} {replyCount === 1 ? "reply" : "replies"}
                  </span>
                </Button>
              )}
            </div>
          )}

          {/* Reply Form */}
          {showReplyForm && !isEditing && (
            <div className="mt-3">
              <CommentForm
                sharedPromptId={sharedPromptId}
                parentId={comment.id}
                onSuccess={(reply) => {
                  setShowReplyForm(false);
                  if (onReplySuccess) {
                    onReplySuccess(reply);
                  }
                }}
                onCancel={() => setShowReplyForm(false)}
                placeholder="Write a reply..."
                autoFocus
              />
            </div>
          )}

          {/* Replies */}
          {hasReplies && showReplies && (
            <div className="mt-4 space-y-4">
              {comment.replies!.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  sharedPromptId={sharedPromptId}
                  onReplySuccess={onReplySuccess}
                  onEditSuccess={onEditSuccess}
                  onDeleteSuccess={onDeleteSuccess}
                  level={level + 1}
                  isPromptAuthor={isPromptAuthor}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}