'use client';

import { useState, useTransition, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedPromptCardClean as UnifiedPromptCard } from '@/components/ui/unified-prompt-card-clean';
import { getSharedPromptsCached as getSharedPrompts } from '@/app/actions/shared-prompts.actions.cached';
import { Loader2, RefreshCw, Search, X, ChevronDown, Star } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionErrorBoundary } from '@/components/error-boundary';
import { NetworkErrorFallback } from '@/components/error-boundary/error-fallbacks';
import { TopbarPortal } from '@/components/layout/topbar-portal';
import { TopbarTitle, TopbarNewButton } from '@/components/layout/topbar';

export interface SharedPrompt {
  id: string;
  promptId: string;
  title: string;
  description?: string | null;
  content: string;
  publishedAt: Date | null;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  copyCount: number;
  isLiked?: boolean;
  author: {
    id: string;
    username: string | null;
    name: string | null;
    avatarType: string;
    profilePicture: string | null;
  };
  prompt: {
    tags: Array<{
      id: string;
      name: string;
    }>;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface SharedPromptsClientProps {
  initialPrompts: SharedPrompt[];
  initialPagination: PaginationInfo | null;
  initialError: string | null;
  searchQuery: string;
  selectedTags: string[];
  sortBy: 'recent' | 'popular' | 'liked' | 'copied';
}

type SortOption = 'trending' | 'copied' | 'liked' | 'newest';

const CATEGORY_TAG_MAP: Record<string, string[]> = {
  Writing: ['writing', 'essay', 'blog', 'content', 'copy', 'article', 'text'],
  Engineering: ['code', 'engineering', 'sql', 'api', 'debug', 'programming', 'developer'],
  Marketing: ['marketing', 'seo', 'ads', 'campaign', 'brand', 'social'],
  Sales: ['sales', 'pitch', 'email', 'crm', 'outreach', 'lead'],
  Support: ['support', 'customer', 'help', 'service', 'ticket', 'chat'],
  Data: ['data', 'analysis', 'analytics', 'report', 'csv', 'excel', 'bi'],
};

const POPULAR_TAGS = ['code', 'sql', 'email', 'writing', 'review', 'data', 'agent'];

const SORT_LABELS: Record<SortOption, string> = {
  trending: 'Trending',
  copied: 'Most copied',
  liked: 'Top rated',
  newest: 'Newest',
};

function sortPrompts(prompts: SharedPrompt[], sort: SortOption): SharedPrompt[] {
  const copy = [...prompts];
  switch (sort) {
    case 'trending':
      return copy.sort((a, b) => b.viewCount - a.viewCount);
    case 'copied':
      return copy.sort((a, b) => b.copyCount - a.copyCount);
    case 'liked':
      return copy.sort((a, b) => b.likeCount - a.likeCount);
    case 'newest':
      return copy.sort((a, b) => {
        const aDate = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bDate = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bDate - aDate;
      });
    default:
      return copy;
  }
}

function promptMatchesCategory(prompt: SharedPrompt, category: string): boolean {
  const tagNames = (prompt.prompt?.tags ?? []).map((t) => t.name.toLowerCase());
  const catTags = CATEGORY_TAG_MAP[category] ?? [];
  return catTags.some((ct) => tagNames.some((t) => t.includes(ct)));
}

function promptMatchesMinRating(prompt: SharedPrompt, minLikes: number): boolean {
  return prompt.likeCount >= minLikes;
}

// Min-rating star thresholds mapped to likeCount
const STAR_THRESHOLDS: Record<number, number> = { 1: 0, 2: 5, 3: 10, 4: 25, 5: 50 };

export function SharedPromptsClient({
  initialPrompts,
  initialPagination,
  initialError,
  searchQuery: initialSearch,
  selectedTags: initialTags,
  sortBy: initialSort,
}: SharedPromptsClientProps) {
  const [prompts, setPrompts] = useState<SharedPrompt[]>(initialPrompts);
  const [pagination, setPagination] = useState<PaginationInfo | null>(initialPagination);
  const [error, setError] = useState<string | null>(initialError);
  const [isPending, startTransition] = useTransition();

  // Local filter state (client-side)
  const [searchText, setSearchText] = useState('');
  const [sort, setSort] = useState<SortOption>('trending');
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [minStars, setMinStars] = useState<number | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const router = useRouter();

  // Reset when server-side props change
  useEffect(() => {
    setPrompts(initialPrompts);
    setPagination(initialPagination);
    setError(initialError);
  }, [initialPrompts, initialPagination, initialError]);

  const loadMore = useCallback(() => {
    if (!pagination?.hasNext || isPending) return;
    startTransition(async () => {
      try {
        const result = await getSharedPrompts({
          page: pagination.page + 1,
          limit: 12,
          search: initialSearch,
          tags: initialTags,
          sortBy: initialSort,
        });
        if (result.success && result.prompts && result.pagination) {
          setPrompts((prev) => [...prev, ...(result.prompts as unknown as SharedPrompt[])]);
          setPagination(result.pagination);
          setError(null);
        } else {
          setError(result.error || 'Failed to load more prompts');
        }
      } catch {
        setError('Failed to load more prompts');
      }
    });
  }, [pagination, isPending, initialSearch, initialTags, initialSort]);

  const handleLikeToggle = useCallback((promptId: string, isLiked: boolean) => {
    setPrompts((prev) =>
      prev.map((p) =>
        p.id === promptId
          ? { ...p, isLiked, likeCount: p.likeCount + (isLiked ? 1 : -1) }
          : p
      )
    );
  }, []);

  const handleCopy = useCallback((promptId: string) => {
    setPrompts((prev) =>
      prev.map((p) => (p.id === promptId ? { ...p, copyCount: p.copyCount + 1 } : p))
    );
  }, []);

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await getSharedPrompts({
          page: 1,
          limit: 12,
          search: initialSearch,
          tags: initialTags,
          sortBy: initialSort,
        });
        if (result.success && result.prompts && result.pagination) {
          setPrompts(result.prompts as unknown as SharedPrompt[]);
          setPagination(result.pagination);
          setError(null);
        } else {
          setError(result.error || 'Failed to refresh prompts');
        }
      } catch {
        setError('Failed to refresh prompts');
      }
    });
  }, [initialSearch, initialTags, initialSort]);

  // Client-side filtered + sorted prompts
  const filteredPrompts = useMemo(() => {
    let result = prompts;

    // Search filter
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          (p.prompt?.tags ?? []).some((t) => t.name.toLowerCase().includes(q)) ||
          (p.author.username ?? '').toLowerCase().includes(q) ||
          (p.author.name ?? '').toLowerCase().includes(q)
      );
    }

    // Category filter
    if (activeCategories.length > 0) {
      result = result.filter((p) =>
        activeCategories.some((cat) => promptMatchesCategory(p, cat))
      );
    }

    // Min-rating filter (using likeCount as proxy)
    if (minStars !== null) {
      const threshold = STAR_THRESHOLDS[minStars] ?? 0;
      result = result.filter((p) => promptMatchesMinRating(p, threshold));
    }

    // Tag filter
    if (activeTags.length > 0) {
      result = result.filter((p) => {
        const tagNames = (p.prompt?.tags ?? []).map((t) => t.name.toLowerCase());
        return activeTags.some((at) => tagNames.some((tn) => tn.includes(at)));
      });
    }

    return sortPrompts(result, sort);
  }, [prompts, searchText, activeCategories, minStars, activeTags, sort]);

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const removeCategory = (cat: string) => {
    setActiveCategories((prev) => prev.filter((c) => c !== cat));
  };

  const removeTag = (tag: string) => {
    setActiveTags((prev) => prev.filter((t) => t !== tag));
  };

  const clearAll = () => {
    setActiveCategories([]);
    setMinStars(null);
    setActiveTags([]);
    setSearchText('');
  };

  const hasActiveFilters =
    activeCategories.length > 0 || minStars !== null || activeTags.length > 0;

  // Chip array for active-filter row
  const filterChips: Array<{ label: string; onRemove: () => void }> = [
    ...activeCategories.map((cat) => ({ label: cat, onRemove: () => removeCategory(cat) })),
    ...(minStars !== null
      ? [{ label: `${minStars}★ & up`, onRemove: () => setMinStars(null) }]
      : []),
    ...activeTags.map((tag) => ({ label: tag, onRemove: () => removeTag(tag) })),
  ];

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive mb-4">
          <p>{error}</p>
        </div>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[7px] border border-line-200 text-ink-600 bg-surface-card hover:bg-surface-muted text-sm"
          onClick={refresh}
          disabled={isPending}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <SectionErrorBoundary
      fallback={<NetworkErrorFallback onReset={refresh} />}
      resetKeys={[prompts.length, pagination?.page || 1]}
    >
      <div className="flex flex-col gap-4">
        <TopbarPortal>
          <TopbarTitle>Prompt Market</TopbarTitle>
          <div className="ml-auto">
            <TopbarNewButton label="Publish" icon={false} onClick={() => router.push('/prompts')} />
          </div>
        </TopbarPortal>
        {/* ── 1. Prominent search bar ── */}
        <div className="bg-surface-card border border-line-200 rounded-[9px] shadow-sm flex items-center gap-3 px-4 py-2.5">
          <Search className="w-4 h-4 text-ink-400 shrink-0" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search public prompts by title, tag, model or author…"
            className="flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-300 outline-none min-w-0"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="text-ink-400 hover:text-ink-600 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {/* "/" hint chip */}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-[4px] border border-line-200 bg-surface-muted text-ink-400 font-mono text-[11px] shrink-0">
            /
          </kbd>
          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setSortDropdownOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-line-200 bg-surface-muted text-ink-600 text-xs hover:bg-surface-card transition-colors"
            >
              <span>Sort: {SORT_LABELS[sort]}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {sortDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-surface-card border border-line-200 rounded-[9px] shadow-md z-20 py-1 min-w-[140px]">
                {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => {
                      setSort(val);
                      setSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                      sort === val
                        ? 'text-accent-700 bg-accent-100'
                        : 'text-ink-600 hover:bg-surface-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 2. Active-filter row ── */}
        {(hasActiveFilters || filterChips.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400">
              Filters:
            </span>
            {filterChips.map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-100 text-accent-700 text-xs font-medium"
              >
                {chip.label}
                <button onClick={chip.onRemove} className="ml-0.5 hover:text-accent-700/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearAll}
              className="text-xs text-accent-700 hover:underline ml-1"
            >
              Clear all
            </button>
            <span className="ml-auto text-xs text-ink-400 tabular-nums">
              {filteredPrompts.length} results
            </span>
          </div>
        )}

        {/* ── 3. Two-column layout ── */}
        <div className="grid grid-cols-[230px_1fr] gap-5 items-start">
          {/* ── LEFT: Filter rail ── */}
          <aside className="bg-surface-card border border-line-200 rounded-[11px] p-4 flex flex-col gap-5 sticky top-4">
            {/* SORT BY */}
            <div>
              <p className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400 mb-2">
                Sort by
              </p>
              <div className="flex flex-col gap-1">
                {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
                  <label
                    key={val}
                    className="flex items-center gap-2.5 cursor-pointer py-1 group"
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        sort === val
                          ? 'border-accent-500 bg-accent-500'
                          : 'border-line-200 group-hover:border-accent-500'
                      }`}
                      onClick={() => setSort(val)}
                    >
                      {sort === val && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <span
                      className={`text-sm ${sort === val ? 'text-ink-900 font-medium' : 'text-ink-600'}`}
                      onClick={() => setSort(val)}
                    >
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* divider */}
            <div className="border-t border-line-100" />

            {/* CATEGORY */}
            <div>
              <p className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400 mb-2">
                Category
              </p>
              <div className="flex flex-col gap-1">
                {Object.keys(CATEGORY_TAG_MAP).map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2.5 cursor-pointer py-1 group"
                  >
                    <span
                      className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-colors ${
                        activeCategories.includes(cat)
                          ? 'border-accent-500 bg-accent-500'
                          : 'border-line-200 group-hover:border-accent-500'
                      }`}
                      onClick={() => toggleCategory(cat)}
                    >
                      {activeCategories.includes(cat) && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          viewBox="0 0 10 10"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M1.5 5L4 7.5L8.5 2.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span
                      className={`text-sm ${activeCategories.includes(cat) ? 'text-ink-900 font-medium' : 'text-ink-600'}`}
                      onClick={() => toggleCategory(cat)}
                    >
                      {cat}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* divider */}
            <div className="border-t border-line-100" />

            {/* MINIMUM RATING */}
            <div>
              <p className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400 mb-2">
                Minimum Rating
              </p>
              <div className="flex flex-col gap-1">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <button
                    key={stars}
                    onClick={() => setMinStars(minStars === stars ? null : stars)}
                    className={`flex items-center gap-2 py-1 text-left group transition-colors ${
                      minStars === stars ? 'text-ink-900' : 'text-ink-600 hover:text-ink-900'
                    }`}
                  >
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < stars ? 'text-star fill-star' : 'text-line-200 fill-line-200'
                          }`}
                        />
                      ))}
                    </span>
                    <span className="text-xs">& up</span>
                    {minStars === stars && (
                      <span className="ml-auto text-[10px] text-accent-700">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* divider */}
            <div className="border-t border-line-100" />

            {/* POPULAR TAGS */}
            <div>
              <p className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400 mb-2">
                Popular Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      activeTags.includes(tag)
                        ? 'bg-accent-500 text-white'
                        : 'bg-surface-muted text-ink-600 hover:bg-accent-100 hover:text-accent-700'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* ── RIGHT: Card grid ── */}
          <div className="min-w-0">
            {/* Result count when no active filter chips row */}
            {!hasActiveFilters && (
              <div className="flex items-center justify-end mb-3">
                <span className="text-xs text-ink-400 tabular-nums">
                  {filteredPrompts.length} results
                </span>
              </div>
            )}

            {filteredPrompts.length === 0 ? (
              <EmptyState
                type={searchText || hasActiveFilters ? 'noResults' : 'noData'}
                title="No prompts found"
                description={
                  searchText || hasActiveFilters
                    ? 'Try adjusting your search or filters'
                    : 'Be the first to share a prompt with the community!'
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredPrompts.map((prompt) => (
                  <UnifiedPromptCard
                    key={prompt.id}
                    variant="shared"
                    data={prompt}
                    onLikeToggle={handleLikeToggle}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            )}

            {/* Load More */}
            {pagination?.hasNext && (
              <div className="text-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-[7px] border border-line-200 text-ink-600 bg-surface-card hover:bg-surface-muted text-sm transition-colors disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    `Load More (${pagination.total - prompts.length} remaining)`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </SectionErrorBoundary>
  );
}
