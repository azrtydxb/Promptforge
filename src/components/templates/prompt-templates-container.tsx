"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Plus,
} from "lucide-react";
import { getPromptTemplates, createPromptFromTemplate } from "@/app/actions/template.actions";
import { useRouter } from "next/navigation";
import { UnifiedPromptCardClean as UnifiedPromptCard } from "@/components/ui/unified-prompt-card-clean";
import { LoadingStates } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

interface TemplateData {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  content: string;
  variables: Record<string, unknown> | null;
  example?: string | null;
  icon?: string | null;
  isPublic: boolean;
  authorId?: string | null;
  usageCount: number;
  rating?: number | null;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: string;
    username: string;
    image?: string | null;
  } | null;
}


export function PromptTemplatesContainer() {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    filterTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, templates]);

  const loadTemplates = async () => {
    try {
      const data = await getPromptTemplates();
      setTemplates(data);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(data.map((t) => t.category))
      );
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (selectedCategory && selectedCategory !== "all") {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleUseTemplate = async (templateId: string) => {
    try {
      const promptId = await createPromptFromTemplate(templateId);
      router.push(`/prompts/${promptId}`);
    } catch (error) {
      console.error("Failed to use template:", error);
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingStates.CardGrid count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Prompt Templates</h1>
        <Button
          onClick={() => router.push("/templates/new")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-card p-4 rounded-lg border border-border shadow-[var(--box-shadow)] mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
        {filteredTemplates.map((template) => {
          // Convert template variables to array format
          const variables = template.variables && typeof template.variables === 'object' 
            ? Object.keys(template.variables)
            : [];
            
          // Convert category to tag format for unified display
          const categoryTag = {
            id: `category-${template.category}`,
            name: template.category.charAt(0).toUpperCase() + template.category.slice(1)
          };
          
          const templateData = {
            ...template,
            title: template.name,
            variables,
            tags: [categoryTag],
          };
          
          return (
            <UnifiedPromptCard
              key={template.id}
              variant="template"
              data={templateData}
              onUseTemplate={() => handleUseTemplate(template.id)}
            />
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <EmptyState
          type="noResults"
          title="No templates found"
          description={searchQuery || selectedCategory !== "all" ? "Try adjusting your search or filters" : "No templates available yet"}
          size="md"
        />
      )}

    </div>
  );
}