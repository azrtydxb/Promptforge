"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import type { CommentFormSubmitResult } from '@/components/comments/types';

interface CommentContextValue {
  sharedPromptId: string;
  promptAuthorId?: string;
  onReplySuccess?: (reply: CommentFormSubmitResult) => void;
  onEditSuccess?: (comment: CommentFormSubmitResult) => void;
  onDeleteSuccess?: (commentId: string) => void;
}

const CommentContext = createContext<CommentContextValue | undefined>(undefined);

interface CommentProviderProps {
  children: ReactNode;
  value: CommentContextValue;
}

export function CommentProvider({ children, value }: CommentProviderProps) {
  return (
    <CommentContext.Provider value={value}>
      {children}
    </CommentContext.Provider>
  );
}

export function useCommentContext() {
  const context = useContext(CommentContext);
  if (context === undefined) {
    throw new Error('useCommentContext must be used within a CommentProvider');
  }
  return context;
}
