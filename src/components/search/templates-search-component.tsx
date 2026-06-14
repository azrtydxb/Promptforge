"use client";

import { useState, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { getPromptTemplates } from "@/app/actions/template.actions";
import { UnifiedPromptCardClean } from "@/components/ui/unified-prompt-card-clean";
import { LoadingStates } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { TopbarPortal } from "@/components/layout/topbar-portal";
import { TopbarTitle, TopbarNewButton } from "@/components/layout/topbar";

interface Template {
  id: string;
  name: string;
  description: string | null;
  content: string;
  category: string;
  usageCount: number;
  rating: number | null;
  author?: {
    id: string;
    image: string | null;
    username: string | null;
  } | null;
}

const CATEGORY_PILLS = ["All", "Writing", "Engineering", "Marketing", "Support", "Data"] as const;
type CategoryPill = (typeof CATEGORY_PILLS)[number];

export function TemplatesSearchComponent() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryPill>("All");

  useEffect(() => {
    async function load() {
      try {
        const data = await getPromptTemplates();
        setTemplates(
          data.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            content: t.content,
            category: t.category,
            usageCount: t.usageCount ?? 0,
            rating: t.rating ?? null,
            author: t.author
              ? { id: t.author.id, image: t.author.image, username: t.author.username }
              : null,
          }))
        );
      } catch (err) {
        console.error("Failed to load templates:", err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return templates.filter((t) => {
      const matchesCategory =
        activeCategory === "All" ||
        t.category.toLowerCase() === activeCategory.toLowerCase();
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [templates, searchQuery, activeCategory]);

  if (isLoading) return <LoadingStates.CardGrid />;

  return (
    <div className="flex flex-col gap-5">
      <TopbarPortal>
        <TopbarTitle>Templates</TopbarTitle>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates…"
              className="h-[30px] w-56 rounded-[7px] border border-line-200 bg-surface-muted pl-8 pr-3 text-[12.5px] text-ink-900 placeholder:text-[#9aa0ab] focus:outline-none"
            />
          </div>
          <TopbarNewButton label="New template" />
        </div>
      </TopbarPortal>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_PILLS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-full px-3.5 py-1 text-[12px] font-[550] transition-colors",
              activeCategory === cat
                ? "bg-accent-500 text-white"
                : "border border-line-200 bg-surface-card text-ink-600 hover:border-accent-500 hover:text-accent-700"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Card grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <UnifiedPromptCardClean
              key={template.id}
              variant="template"
              data={{
                id: template.id,
                title: template.name,
                name: template.name,
                description: template.description,
                content: template.content,
                category: template.category,
                usageCount: template.usageCount,
                rating: template.rating,
                author: template.author
                  ? {
                      id: template.author.id,
                      username: template.author.username,
                      image: template.author.image,
                    }
                  : undefined,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-[11px] border border-line-200 bg-surface-muted py-16 text-center">
          <p className="text-[14px] font-[550] text-ink-900">No templates found</p>
          <p className="mt-1 text-[12px] text-ink-400">
            Try a different search term or category filter.
          </p>
        </div>
      )}
    </div>
  );
}
