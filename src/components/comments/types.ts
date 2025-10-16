/**
 * Type definitions for comment components
 */

export interface CommentUser {
  id: string;
  username: string | null;
  name: string | null;
  avatarType: string;
  profilePicture: string | null;
  reputationScore?: number;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  likeCount?: number;
  isLiked?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  user: CommentUser;
  replies?: Comment[];
  _count?: {
    replies: number;
  };
  parentId?: string | null;
}

export interface CommentFormSubmitResult {
  id: string;
  content: string;
  parentId?: string | null;
  user: CommentUser;
  createdAt: Date;
  updatedAt: Date;
  likeCount?: number;
  isLiked?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  _count?: {
    replies: number;
  };
  sharedPromptId?: string;
  userId?: string;
}
