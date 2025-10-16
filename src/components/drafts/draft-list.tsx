'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Trash2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { deleteDraft } from '@/app/actions/drafts.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Draft {
  id: string;
  promptId: string | null;
  title: string;
  description: string | null;
  content: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface DraftListProps {
  drafts: Draft[];
  emptyMessage?: string;
}

export function DraftList({
  drafts,
  emptyMessage = 'No drafts yet. Start creating a prompt to see drafts here.',
}: DraftListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, draftId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this draft?')) {
      return;
    }

    setDeletingId(draftId);

    try {
      const result = await deleteDraft(draftId);

      if (result.success) {
        toast.success('Draft deleted successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete draft');
      }
    } catch {
      toast.error('An error occurred while deleting draft');
    } finally {
      setDeletingId(null);
    }
  };

  if (drafts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-12 pb-12">
          <div className="text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {drafts.map((draft) => (
        <Link
          key={draft.id}
          href={
            draft.promptId
              ? `/dashboard/prompts/${draft.promptId}/edit`
              : `/dashboard/prompts/new?draftId=${draft.id}`
          }
        >
          <Card className="hover:border-primary transition-colors cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{draft.title}</h3>
                    {draft.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {draft.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDelete(e, draft.id)}
                    disabled={deletingId === draft.id}
                    className="text-destructive hover:text-destructive h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {draft.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {draft.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {draft.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{draft.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(new Date(draft.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  {draft.promptId && (
                    <Badge variant="outline" className="text-xs">
                      Editing
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
