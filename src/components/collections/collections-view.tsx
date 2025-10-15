'use client';

import React, { useState } from 'react';
import { CollectionsManager } from '@/components/marketplace/collections-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder, Globe, Lock } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  createCollection,
  updateCollection,
  deleteCollection,
} from '@/app/actions/collections.actions';

interface Collection {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    name: string | null;
    username: string | null;
  };
  _count?: {
    prompts: number;
  };
}

interface CollectionsViewProps {
  userCollections: Collection[];
  publicCollections: Collection[];
  userId: string;
}

export function CollectionsView({
  userCollections: initialUserCollections,
  publicCollections,
  userId,
}: CollectionsViewProps) {
  const router = useRouter();
  const [userCollections, setUserCollections] = useState(initialUserCollections);

  const handleCreateCollection = async (data: {
    name: string;
    description?: string;
    isPublic: boolean;
  }) => {
    const result = await createCollection(data);

    if (result.success && result.collection) {
      setUserCollections((prev) => [result.collection!, ...prev]);
      toast.success('Collection created successfully');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to create collection');
    }
  };

  const handleUpdateCollection = async (
    id: string,
    data: {
      name: string;
      description?: string;
      isPublic: boolean;
    }
  ) => {
    const result = await updateCollection(id, data);

    if (result.success && result.collection) {
      setUserCollections((prev) =>
        prev.map((col) => (col.id === id ? result.collection! : col))
      );
      toast.success('Collection updated successfully');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to update collection');
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) {
      return;
    }

    const result = await deleteCollection(id);

    if (result.success) {
      setUserCollections((prev) => prev.filter((col) => col.id !== id));
      toast.success('Collection deleted successfully');
      router.refresh();
    } else {
      toast.error(result.error || 'Failed to delete collection');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Collections</h1>
        <p className="text-muted-foreground mt-2">
          Organize your favorite prompts into collections and discover
          collections from the community
        </p>
      </div>

      <Tabs defaultValue="my-collections" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-collections">
            <Lock className="w-4 h-4 mr-2" />
            My Collections
          </TabsTrigger>
          <TabsTrigger value="public">
            <Globe className="w-4 h-4 mr-2" />
            Public Collections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-collections" className="space-y-6">
          <CollectionsManager
            collections={userCollections}
            onCreateCollection={handleCreateCollection}
            onUpdateCollection={handleUpdateCollection}
            onDeleteCollection={handleDeleteCollection}
          />
        </TabsContent>

        <TabsContent value="public" className="space-y-6">
          {publicCollections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {publicCollections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.id}`}
                >
                  <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Folder className="w-5 h-5 text-primary flex-shrink-0" />
                          <CardTitle className="text-lg truncate">
                            {collection.name}
                          </CardTitle>
                        </div>
                        <Globe className="w-4 h-4 text-green-500 flex-shrink-0" />
                      </div>

                      {collection.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {collection.description}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            by{' '}
                            {collection.user?.name || collection.user?.username}
                          </span>
                          <Badge variant="secondary">
                            {collection._count?.prompts || 0} prompts
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">
                    No public collections yet
                  </h3>
                  <p className="text-sm">
                    Be the first to share a collection with the community
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
