"use client";

import { useState, useEffect } from "react";
import { UnifiedSearch } from "@/components/search/unified-search";
import { getPromptTemplates } from "@/app/actions/template.actions";
import { UnifiedPromptCardClean as UnifiedPromptCard } from "@/components/ui/unified-prompt-card-clean";
import { LoadingStates } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function TemplatesSearchComponent() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await getPromptTemplates();
      setTemplates(data);
      setFilteredTemplates(data);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(data.map((t) => t.category))
      );
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string, mode: string, filters: any) => {
    const filtered = templates.filter(template => {
      const matchesQuery = !query || 
        template.name.toLowerCase().includes(query.toLowerCase()) ||
        template.description?.toLowerCase().includes(query.toLowerCase()) ||
        template.content.toLowerCase().includes(query.toLowerCase());
      
      const matchesCategory = !filters.category || 
        filters.category === "all" || 
        template.category === filters.category;
      
      return matchesQuery && matchesCategory;
    });

    setFilteredTemplates(filtered);
  };

  const filtersComponent = (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={selectedCategory}
          onValueChange={(value) => {
            setSelectedCategory(value);
            handleSearch("", "keyword", { category: value });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const formatTemplateForCard = (template: any) => ({
    id: template.id,
    title: template.name,
    description: template.description,
    content: template.content,
    type: "template" as const,
    tags: [],
    isLiked: false,
    isPublic: template.isPublic,
    metrics: {
      likes: 0,
      views: template.usageCount || 0,
      copies: template.usageCount || 0,
      comments: 0,
    },
    author: template.author || null,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  });

  if (isLoading) {
    return <LoadingStates.PromptGrid />;
  }

  return (
    <div className="space-y-6">
      <UnifiedSearch
        dataSource="templates"
        onSearch={handleSearch}
        placeholder="Search templates..."
        filters={filtersComponent}
        showModeSelector={false} // Templates don't support semantic search yet
        showHistory={true}
        semanticSearchEnabled={false}
      />

      {filteredTemplates.length > 0 ? (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            Found {filteredTemplates.length} templates
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {filteredTemplates.map((template) => (
              <UnifiedPromptCard
                key={template.id}
                {...formatTemplateForCard(template)}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon="template"
          title="No templates found"
          description="Try adjusting your search query or filters"
        />
      )}
    </div>
  );
}