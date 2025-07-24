"use client";

import { useState, useEffect } from "react";
import { getTagsWithPrompts } from "@/app/actions/tag-management.actions";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingStates } from "@/components/ui/loading-state";
import { EmptyStates } from "@/components/ui/empty-state";

interface Tag {
  id: string;
  name: string;
  description: string | null;
  prompts: Array<{
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
  _count: {
    prompts: number;
  };
}

interface TagSidebarProps {
  onSelectTag: (tagId: string | null, tagName: string) => void;
  selectedTag: {
    id: string | null;
    name: string;
  };
}

export const TagSidebar = ({ onSelectTag, selectedTag }: TagSidebarProps) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const fetchedTags = await getTagsWithPrompts();
        setTags(fetchedTags);
      } catch (error) {
        console.error("Error fetching tags:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  if (loading) {
    return <LoadingStates.Sidebar />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Tags</h2>
        <p className="text-sm text-muted-foreground">
          Browse prompts by tag
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {/* All prompts option */}
          <button
            onClick={() => onSelectTag(null, "All Prompts")}
            className={cn(
              "w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent",
              selectedTag.id === null && "bg-accent border-accent-foreground/20"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">All Prompts</span>
              <Badge variant="secondary">
                {tags.reduce((sum, tag) => sum + tag._count.prompts, 0)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              View all prompts regardless of tags
            </p>
          </button>

          {/* Individual tags */}
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => onSelectTag(tag.id, tag.name)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent",
                selectedTag.id === tag.id && "bg-accent border-accent-foreground/20"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{tag.name}</span>
                <Badge variant="secondary">{tag._count.prompts}</Badge>
              </div>
              {tag.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {tag.description}
                </p>
              )}
            </button>
          ))}

          {tags.length === 0 && (
            <EmptyStates.NoTags />
          )}
        </div>
      </ScrollArea>
    </div>
  );
};