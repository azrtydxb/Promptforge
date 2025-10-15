"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UnifiedPromptCardClean as UnifiedPromptCard } from "@/components/ui/unified-prompt-card-clean";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingStates } from "@/components/ui/loading-state";
import { 
  Search, 
  Plus,
  Users,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import type { Team, Prompt, Tag } from "@/generated/prisma";

interface TeamPromptsViewProps {
  team: Team;
  prompts: Array<Prompt & {
    user: {
      id: string;
      name: string | null;
      username: string | null;
      email: string | null;
    };
    tags: Tag[];
    _count: {
      likes: number;
      favorites: number;
      versions: number;
    };
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  currentUserId: string;
  searchQuery?: string;
}

export function TeamPromptsView({
  team,
  prompts,
  pagination,
  currentUserId,
  searchQuery = "",
}: TeamPromptsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchQuery);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    
    const params = new URLSearchParams(searchParams);
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    params.set("page", "1"); // Reset to first page on search
    
    router.push(`/teams/${team.id}/prompts?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`/teams/${team.id}/prompts?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{team.name} Prompts</h1>
          <p className="text-muted-foreground mt-1">
            Collaborate on prompts with your team
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/teams/${team.id}`}>
              <Users className="h-4 w-4 mr-2" />
              Team Dashboard
            </Link>
          </Button>
          <Button asChild>
            <Link href="/prompts/new">
              <Plus className="h-4 w-4 mr-2" />
              New Prompt
            </Link>
          </Button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search team prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isSearching}>
          Search
        </Button>
      </form>

      {/* Prompts Grid */}
      {isSearching ? (
        <LoadingStates.CardGrid count={6} />
      ) : prompts.length === 0 ? (
        <EmptyState
          type={searchQuery ? "noResults" : "noData"}
          icon={Users}
          title={searchQuery ? "No prompts found" : "No team prompts yet"}
          description={
            searchQuery
              ? "Try adjusting your search query"
              : "Create your first team prompt to get started"
          }
          actions={
            !searchQuery ? [
              {
                label: "Create First Prompt",
                onClick: () => router.push("/prompts/new"),
                variant: "default" as const
              }
            ] : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {prompts.map((prompt) => (
              <UnifiedPromptCard
                key={prompt.id}
                variant="personal"
                data={{
                  ...prompt,
                  createdAt: new Date(prompt.createdAt),
                  updatedAt: new Date(prompt.updatedAt),
                  lastUsedAt: prompt.lastUsedAt ? new Date(prompt.lastUsedAt) : null,
                }}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} prompts
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}