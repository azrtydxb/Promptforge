"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Tag as TagIcon } from "lucide-react";
import { useModal, type TagData } from "@/hooks/use-modal-store";
import { sectionSpacing } from "@/lib/styles";

interface Tag {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  _count: {
    prompts: number;
  };
}

interface TagsManagementProps {
  initialTags: Tag[];
}

export function TagsManagement({ initialTags }: TagsManagementProps) {
  const [tags, setTags] = useState(initialTags);
  const { onOpen } = useModal();

  const handleCreateTag = () => {
    onOpen("createTag", {
      onSuccess: (newTag?: TagData | void) => {
        if (newTag && typeof newTag === 'object') {
          setTags(prev => [...prev, { ...newTag, createdAt: new Date(), _count: { prompts: 0 } }]);
        }
      }
    });
  };

  const handleEditTag = (tag: Tag) => {
    onOpen("editTag", {
      tag,
      onSuccess: (updatedTag?: TagData | void) => {
        if (updatedTag && typeof updatedTag === 'object') {
          setTags(prev => prev.map(t => t.id === updatedTag.id ? { ...t, ...updatedTag } : t));
        }
      }
    });
  };

  const handleDeleteTag = (tag: Tag) => {
    onOpen("deleteTag", {
      tag,
      onSuccess: () => {
        setTags(prev => prev.filter(t => t.id !== tag.id));
      }
    });
  };

  return (
    <div className={sectionSpacing("pt-4")}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Your Tags</h2>
          <p className="text-sm text-muted-foreground">
            {tags.length} tag{tags.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button onClick={handleCreateTag} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Tag
        </Button>
      </div>

      {tags.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TagIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tags yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first tag to start organizing your prompts.
            </p>
            <Button onClick={handleCreateTag}>
              <Plus className="h-4 w-4 mr-2" />
              Create Tag
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {tags.map((tag, index) => {
            // Cycle through gradient colors for visual variety - using full class strings for Tailwind JIT
            const getIconBgClass = () => {
              switch (index % 5) {
                case 0: return "bg-gradient-to-br from-blue-500 to-purple-600";
                case 1: return "bg-gradient-to-br from-purple-500 to-pink-600";
                case 2: return "bg-gradient-to-br from-emerald-500 to-teal-600";
                case 3: return "bg-gradient-to-br from-amber-500 to-orange-600";
                case 4: return "bg-gradient-to-br from-rose-500 to-red-600";
                default: return "bg-gradient-to-br from-blue-500 to-purple-600";
              }
            };

            const getHoverLineClass = () => {
              switch (index % 5) {
                case 0: return "bg-gradient-to-r from-blue-500 to-purple-600";
                case 1: return "bg-gradient-to-r from-purple-500 to-pink-600";
                case 2: return "bg-gradient-to-r from-emerald-500 to-teal-600";
                case 3: return "bg-gradient-to-r from-amber-500 to-orange-600";
                case 4: return "bg-gradient-to-r from-rose-500 to-red-600";
                default: return "bg-gradient-to-r from-blue-500 to-purple-600";
              }
            };

            return (
              <Card
                key={tag.id}
                className="relative group cursor-pointer border border-border/50 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                onClick={() => handleEditTag(tag)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg shadow-md ${getIconBgClass()}`}>
                      <TagIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTag(tag);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <h3 className="font-semibold text-sm mb-1 truncate">{tag.name}</h3>
                    {tag.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{tag.description}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="secondary" className="px-2 py-0.5 font-medium">
                      {tag._count.prompts} prompt{tag._count.prompts !== 1 ? 's' : ''}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(tag.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  {/* Hover indicator line */}
                  <div className={`absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-b-lg ${getHoverLineClass()}`} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}