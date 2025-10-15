'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Folder,
  ArrowLeft,
  Lock,
  Globe,
  Trash2,
  Edit,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  removePromptFromCollection,
  deleteCollection,
} from '@/app/actions/collections.actions';
import { CollectionPromptCard } from '@/components/marketplace/collections-manager';

interface CollectionPrompt {
  id: string;
  addedAt: Date;
  sharedPrompt: {
    id: string;
    prompt: {
      title: string;
      description: string | null;
    };
    author: {
      name: string | null;
      username: string | null;
    };
    _count: {
      ratings: number;
      copies: number;
    };
  };
}

interface Collection {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    name: string | null;
    username: string | null;
  };
  prompts: CollectionPrompt[];
  _count: {
    prompts: number;
  };
}

interface CollectionDetailViewProps {
  collection: Collection;
  isOwner: boolean;
}

export function CollectionDetailView({
  collection: initialCollection,
  isOwner,
}: CollectionDetailViewProps) {
  const router = useRouter();
  const [collection, setCollection] = useState(initialCollection);

  const handleRemovePrompt = async (sharedPromptId: string) => {
    if (!confirm('Remove this prompt from the collection?')) {
      return;
    }

    const result = await removePromptFromCollection(
      collection.id,
      sharedPromptId
    );

    if (result.success) {
      setCollection((prev) => ({
        ...prev,
        prompts: prev.prompts.filter(
          (p) => p.sharedPrompt.id !== sharedPromptId
        ),
        _count: {
          prompts: prev._count.prompts - 1,
        },
      }));
      toast.success('Prompt removed from collection');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to remove prompt');
    }
  };

  const handleDeleteCollection = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this collection? This action cannot be undone.'
      )
    ) {
      return;
    }

    const result = await deleteCollection(collection.id);

    if (result.success) {
      toast.success('Collection deleted successfully');
      router.push('/collections');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to delete collection');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Link href="/collections">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Collections
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <Folder className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">{collection.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  by {collection.user.name || collection.user.username}
                </span>
                {collection.isPublic ? (
                  <Badge variant="secondary" className="gap-1">
                    <Globe className="w-3 h-3" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="w-3 h-3" />
                    Private
                  </Badge>
                )}
                <Badge variant="outline">
                  {collection._count.prompts} prompts
                </Badge>
              </div>
            </div>
          </div>

          {collection.description && (
            <p className="text-muted-foreground mt-4">
              {collection.description}
            </p>
          )}
        </div>

        {isOwner && (
          <div className="flex items-center gap-2">
            <Link href={`/collections/${collection.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteCollection}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Prompts */}
      {collection.prompts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collection.prompts.map((item) => (
            <Link
              key={item.id}
              href={`/marketplace/${item.sharedPrompt.id}`}
              className="block"
            >
              <CollectionPromptCard
                prompt={{
                  id: item.sharedPrompt.id,
                  title: item.sharedPrompt.prompt.title,
                  description: item.sharedPrompt.prompt.description,
                  author: item.sharedPrompt.author,
                  likeCount: item.sharedPrompt._count.ratings,
                  copyCount: item.sharedPrompt._count.copies,
                }}
                onRemove={
                  isOwner
                    ? (promptId) => handleRemovePrompt(promptId)
                    : undefined
                }
              />
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                No prompts in this collection yet
              </h3>
              <p className="text-sm">
                {isOwner
                  ? 'Add prompts from the marketplace to start building your collection'
                  : 'This collection is empty'}
              </p>
              {isOwner && (
                <Link href="/marketplace">
                  <Button className="mt-4">Browse Marketplace</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
