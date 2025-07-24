"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Code,
  FileText,
  MessageSquare,
  Briefcase,
  GraduationCap,
  Palette,
  TrendingUp,
  Plus,
  Star,
  Copy,
  ArrowRight,
} from "lucide-react";
import { getPromptTemplates, createPromptFromTemplate } from "@/app/actions/template.actions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { dellCard } from "@/lib/styles";
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

const categoryIcons: Record<string, React.ElementType> = {
  coding: Code,
  writing: FileText,
  chat: MessageSquare,
  business: Briefcase,
  education: GraduationCap,
  creative: Palette,
  analysis: TrendingUp,
};

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

  const getTemplateIcon = (category: string) => {
    const Icon = categoryIcons[category] || FileText;
    return Icon;
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
      <div className="flex items-center justify-end">
        <Button
          onClick={() => router.push("/templates/new")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => {
          const Icon = getTemplateIcon(template.category);
          return (
            <Card
              key={template.id}
              className={cn(dellCard('interactive'), "bg-card/50 dark:bg-card/30")}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg",
                        "bg-muted",
                        "group-hover:bg-primary/10",
                        "transition-colors"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {template.category}
                      </Badge>
                    </div>
                  </div>
                  {template.rating && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3 w-3 fill-current text-yellow-500" />
                      {template.rating.toFixed(1)}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {template.description && (
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                )}
                
                {template.variables && typeof template.variables === 'object' && Object.keys(template.variables).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Variables:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(template.variables).map((variable) => (
                        <Badge key={variable} variant="outline" className="text-xs">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {template.example && (
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Example:
                    </p>
                    <p className="text-xs text-foreground/80 line-clamp-2">
                      {template.example}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Copy className="h-3 w-3" />
                    <span>{template.usageCount} uses</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleUseTemplate(template.id)}
                  >
                    Use Template
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
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