'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Folder, 
  Edit, 
  Trash2, 
  BookOpen,
  Lock,
  Globe,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Collection {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    prompts: number;
  };
}

interface CollectionsManagerProps {
  collections: Collection[];
  onCreateCollection?: (data: { name: string; description?: string; isPublic: boolean }) => void;
  onUpdateCollection?: (id: string, data: { name: string; description?: string; isPublic: boolean }) => void;
  onDeleteCollection?: (id: string) => void;
  className?: string;
}

export function CollectionsManager({
  collections,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  className
}: CollectionsManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      onUpdateCollection?.(editingId, formData);
      setEditingId(null);
    } else {
      onCreateCollection?.(formData);
      setIsCreating(false);
    }
    
    setFormData({ name: '', description: '', isPublic: false });
  };

  const handleEdit = (collection: Collection) => {
    setFormData({
      name: collection.name,
      description: collection.description || '',
      isPublic: collection.isPublic
    });
    setEditingId(collection.id);
    setIsCreating(true);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: '', description: '', isPublic: false });
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">My Collections</h2>
          <p className="text-sm text-gray-400">
            Organize your favorite prompts into collections
          </p>
        </div>
        {!isCreating && (
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-[#007DB8] hover:bg-[#007DB8]/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Collection
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {isCreating && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">
              {editingId ? 'Edit Collection' : 'Create New Collection'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter collection name..."
                  required
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your collection..."
                  rows={3}
                  className="bg-gray-700 border-gray-600 text-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="isPublic" className="text-white cursor-pointer">
                  Make this collection public
                </Label>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-[#007DB8] hover:bg-[#007DB8]/90"
                  disabled={!formData.name.trim()}
                >
                  {editingId ? 'Update' : 'Create'} Collection
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Collections Grid */}
      {collections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection) => (
            <Card key={collection.id} className="bg-gray-100 border-gray-300 hover:border-gray-400 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="w-5 h-5 text-[#007DB8]" />
                    <CardTitle className="text-lg text-white truncate">
                      {collection.name}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {collection.isPublic ? (
                      <div title="Public collection">
                        <Globe className="w-4 h-4 text-green-400" />
                      </div>
                    ) : (
                      <div title="Private collection">
                        <Lock className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
                
                {collection.description && (
                  <p className="text-sm text-gray-400 line-clamp-2">
                    {collection.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {collection._count?.prompts || 0} prompts
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="text-xs bg-gray-700 text-gray-300"
                    >
                      {collection.isPublic ? 'Public' : 'Private'}
                    </Badge>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(collection)}
                      className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteCollection?.(collection.id)}
                      className="border-red-600 text-red-400 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-gray-100 border-gray-300">
          <CardContent className="pt-12 pb-12">
            <div className="text-center text-gray-400">
              <Folder className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium mb-2">No collections yet</h3>
              <p className="text-sm mb-4">
                Create your first collection to organize your favorite prompts
              </p>
              {!isCreating && (
                <Button
                  onClick={() => setIsCreating(true)}
                  className="bg-[#007DB8] hover:bg-[#007DB8]/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Collection
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface CollectionPromptCardProps {
  prompt: {
    id: string;
    title: string;
    description?: string | null;
    author: {
      username: string | null;
      name: string | null;
    };
    likeCount: number;
    copyCount: number;
  };
  onRemove?: (promptId: string) => void;
  className?: string;
}

export function CollectionPromptCard({ 
  prompt, 
  onRemove, 
  className 
}: CollectionPromptCardProps) {
  return (
    <Card className={cn("bg-gray-100 border-gray-300 hover:border-gray-400 transition-colors", className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white truncate">{prompt.title}</h3>
              {prompt.description && (
                <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                  {prompt.description}
                </p>
              )}
            </div>
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(prompt.id)}
                className="text-gray-400 hover:text-red-400 h-6 w-6 p-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>by {prompt.author.name || prompt.author.username}</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {prompt.likeCount}
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {prompt.copyCount}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}