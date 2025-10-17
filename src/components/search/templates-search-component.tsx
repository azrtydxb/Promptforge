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

interface Template {
  id: string;
  name: string;
  title?: string;
  description: string | null;
  content: string;
  category: string;
  author?: {
    id: string;
    image: string | null;
    username: string;
  } | null;
}

export function TemplatesSearchComponent() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await getPromptTemplates();
      const mappedTemplates: Template[] = data.map(t => ({
        id: t.id,
        name: t.name,
        title: t.name,
        description: t.description,
        content: t.content,
        category: t.category,
        author: t.author,
      }));
      setTemplates(mappedTemplates);
      setFilteredTemplates(mappedTemplates);

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(mappedTemplates.map((t) => t.category))
      );
      setCategories(uniqueCategories);
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string, _mode: string, filters: { category?: string }) => {
    const filtered = templates.filter(template => {
      const matchesQuery = !query ||
        template.name.toLowerCase().includes(query.toLowerCase()) ||
        (template.description || '').toLowerCase().includes(query.toLowerCase()) ||
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

  if (isLoading) {
    return <LoadingStates.CardGrid />;
  }

  return (
    <div className="space-y-6">
      <UnifiedSearch
        dataSource="templates"
        onSearch={handleSearch}
        placeholder="Search templates..."
        filters={filtersComponent}
        showHistory={true}
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
                variant="template"
                data={{
                  id: template.id,
                  title: template.title || template.name,
                  name: template.name || template.title || 'Untitled',
                  description: template.description,
                  content: template.content,
                  category: template.category,
                  author: template.author ? {
                    id: template.author.id,
                    username: template.author.username,
                    image: template.author.image,
                  } : undefined,
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          type="noData"
          title="No templates found"
          description="Try adjusting your search query or filters"
        />
      )}
    </div>
  );
}