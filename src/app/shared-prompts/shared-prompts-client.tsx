'use client';

import { useState, useTransition, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedPromptCardClean as UnifiedPromptCard } from '@/components/ui/unified-prompt-card-clean';
import { getSharedPrompts } from '@/app/actions/shared-prompts.actions';
import { getAllPrompts } from '@/app/actions/prompt.actions';
import { publishPromptToMarketplace } from '@/app/actions/shared-prompts.actions';
import { Loader2, RefreshCw, Search, X, ChevronDown, Star } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionErrorBoundary } from '@/components/error-boundary';
import { NetworkErrorFallback } from '@/components/error-boundary/error-fallbacks';
import { TopbarPortal } from '@/components/layout/topbar-portal';
import { TopbarTitle, TopbarNewButton } from '@/components/layout/topbar';
import { toast } from 'sonner';

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
  popularTags?: string[];
}

type SortOption = 'trending' | 'copied' | 'top-rated' | 'newest';

const CATEGORY_OPTIONS = ['Writing', 'Engineering', 'Marketing', 'Sales', 'Support', 'Data'] as const;

const SORT_LABELS: Record<SortOption, string> = {
  trending: 'Trending',
  copied: 'Most copied',
  'top-rated': 'Top rated',
  newest: 'Newest',
};

// Map client SortOption to server sortBy param
function toServerSort(sort: SortOption): 'trending' | 'most-copied' | 'top-rated' | 'newest' {
  switch (sort) {
    case 'trending': return 'trending';
    case 'copied': return 'most-copied';
    case 'top-rated': return 'top-rated';
    case 'newest': return 'newest';
  }
}

interface UserPrompt {
  id: string;
  title: string;
}

export function SharedPromptsClient({
  initialPrompts,
  initialPagination,
  initialError,
  searchQuery: _initialSearch,
  selectedTags: _initialTags,
  sortBy: _initialSort,
  popularTags = [],
}: SharedPromptsClientProps) {
  const [prompts, setPrompts] = useState<SharedPrompt[]>(initialPrompts);
  const [pagination, setPagination] = useState<PaginationInfo | null>(initialPagination);
  const [error, setError] = useState<string | null>(initialError);
  const [isPending, startTransition] = useTransition();

  // Server-side filter state
  const [searchText, setSearchText] = useState('');
  const [sort, setSort] = useState<SortOption>('trending');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // Publish modal state
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [userPrompts, setUserPrompts] = useState<UserPrompt[]>([]);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Reset when server-side props change
  useEffect(() => {
    setPrompts(initialPrompts);
    setPagination(initialPagination);
    setError(initialError);
  }, [initialPrompts, initialPagination, initialError]);

  // Fetch from server whenever filters change
  const fetchPrompts = useCallback((opts: {
    search?: string;
    sort?: SortOption;
    category?: string | null;
    minRating?: number | null;
    tags?: string[];
    page?: number;
    append?: boolean;
  }) => {
    const {
      search = searchText,
      sort: s = sort,
      category = activeCategory,
      minRating: mr = minRating,
      tags = activeTags,
      page = 1,
      append = false,
    } = opts;

    startTransition(async () => {
      try {
        const result = await getSharedPrompts({
          page,
          limit: 12,
          search: search || undefined,
          tags: tags.length > 0 ? tags : undefined,
          sortBy: toServerSort(s),
          category: category || undefined,
          minRating: mr ?? undefined,
        });
        if (result.success && result.prompts && result.pagination) {
          const newPrompts = result.prompts as unknown as SharedPrompt[];
          setPrompts((prev) => append ? [...prev, ...newPrompts] : newPrompts);
          setPagination(result.pagination);
          setError(null);
        } else {
          setError(result.error || 'Failed to load prompts');
        }
      } catch {
        setError('Failed to load prompts');
      }
    });
  }, [searchText, sort, activeCategory, minRating, activeTags]);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearchText(val);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchPrompts({ search: val, page: 1 });
    }, 350);
  };

  const handleSortChange = (val: SortOption) => {
    setSort(val);
    setSortDropdownOpen(false);
    fetchPrompts({ sort: val, page: 1 });
  };

  const handleCategoryToggle = (cat: string) => {
    const next = activeCategory === cat ? null : cat;
    setActiveCategory(next);
    fetchPrompts({ category: next, page: 1 });
  };

  const handleMinRatingChange = (stars: number) => {
    const next = minRating === stars ? null : stars;
    setMinRating(next);
    fetchPrompts({ minRating: next, page: 1 });
  };

  const handleTagToggle = (tag: string) => {
    const next = activeTags.includes(tag)
      ? activeTags.filter((t) => t !== tag)
      : [...activeTags, tag];
    setActiveTags(next);
    fetchPrompts({ tags: next, page: 1 });
  };

  const handleTagRemove = (tag: string) => {
    const next = activeTags.filter((t) => t !== tag);
    setActiveTags(next);
    fetchPrompts({ tags: next, page: 1 });
  };

  const clearAll = () => {
    setActiveCategory(null);
    setMinRating(null);
    setActiveTags([]);
    setSearchText('');
    fetchPrompts({ search: '', category: null, minRating: null, tags: [], page: 1 });
  };

  const loadMore = useCallback(() => {
    if (!pagination?.hasNext || isPending) return;
    fetchPrompts({ page: pagination.page + 1, append: true });
  }, [pagination, isPending, fetchPrompts]);

  const refresh = useCallback(() => {
    fetchPrompts({ page: 1 });
  }, [fetchPrompts]);

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

  // Publish modal
  const openPublishModal = async () => {
    try {
      const result = await getAllPrompts();
      setUserPrompts(result.map((p) => ({ id: p.id, title: p.title })));
    } catch {
      toast.error('Failed to load your prompts');
      return;
    }
    setPublishModalOpen(true);
  };

  const handlePublish = async (promptId: string) => {
    setPublishingId(promptId);
    try {
      const result = await publishPromptToMarketplace({ promptId });
      if (result.success) {
        toast.success(result.message ?? 'Prompt published!');
        setPublishModalOpen(false);
        refresh();
      } else {
        toast.error(result.error ?? 'Failed to publish prompt');
      }
    } catch {
      toast.error('Failed to publish prompt');
    } finally {
      setPublishingId(null);
    }
  };

  const hasActiveFilters =
    activeCategory !== null || minRating !== null || activeTags.length > 0;

  // Chip array for active-filter row
  const filterChips: Array<{ label: string; onRemove: () => void }> = [
    ...(activeCategory ? [{ label: activeCategory, onRemove: () => { setActiveCategory(null); fetchPrompts({ category: null, page: 1 }); } }] : []),
    ...(minRating !== null ? [{ label: `${minRating}★ & up`, onRemove: () => { setMinRating(null); fetchPrompts({ minRating: null, page: 1 }); } }] : []),
    ...activeTags.map((tag) => ({ label: tag, onRemove: () => handleTagRemove(tag) })),
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
            <TopbarNewButton label="Publish" icon={false} onClick={openPublishModal} />
          </div>
        </TopbarPortal>

        {/* ── Publish modal ── */}
        {publishModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPublishModalOpen(false)}>
            <div
              className="bg-surface-card border border-line-200 rounded-[13px] shadow-xl w-full max-w-md mx-4 p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[15px] font-[650] text-ink-900">Publish a prompt</h2>
                <button onClick={() => setPublishModalOpen(false)} className="text-ink-400 hover:text-ink-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {userPrompts.length === 0 ? (
                <p className="text-sm text-ink-400 text-center py-6">You have no prompts to publish.</p>
              ) : (
                <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
                  {userPrompts.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 rounded-[8px] px-3 py-2.5 hover:bg-surface-muted">
                      <span className="text-sm text-ink-800 truncate flex-1">{p.title}</span>
                      <button
                        onClick={() => handlePublish(p.id)}
                        disabled={publishingId === p.id}
                        className="shrink-0 text-xs font-[550] px-3 py-1 rounded-[6px] bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 transition-colors"
                      >
                        {publishingId === p.id ? 'Publishing…' : 'Publish'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ── 1. Prominent search bar ── */}
        <div className="bg-surface-card border border-line-200 rounded-[9px] shadow-sm flex items-center gap-3 px-4 py-2.5">
          <Search className="w-4 h-4 text-ink-400 shrink-0" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search public prompts by title, tag, model or author…"
            className="flex-1 bg-transparent text-sm text-ink-900 placeholder:text-ink-300 outline-none min-w-0"
          />
          {searchText && (
            <button
              onClick={() => handleSearchChange('')}
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
                    onClick={() => handleSortChange(val)}
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
              {pagination?.total ?? prompts.length} results
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
                      onClick={() => handleSortChange(val)}
                    >
                      {sort === val && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </span>
                    <span
                      className={`text-sm ${sort === val ? 'text-ink-900 font-medium' : 'text-ink-600'}`}
                      onClick={() => handleSortChange(val)}
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
                {CATEGORY_OPTIONS.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2.5 cursor-pointer py-1 group"
                  >
                    <span
                      className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center shrink-0 transition-colors ${
                        activeCategory === cat
                          ? 'border-accent-500 bg-accent-500'
                          : 'border-line-200 group-hover:border-accent-500'
                      }`}
                      onClick={() => handleCategoryToggle(cat)}
                    >
                      {activeCategory === cat && (
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
                      className={`text-sm ${activeCategory === cat ? 'text-ink-900 font-medium' : 'text-ink-600'}`}
                      onClick={() => handleCategoryToggle(cat)}
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
                    onClick={() => handleMinRatingChange(stars)}
                    className={`flex items-center gap-2 py-1 text-left group transition-colors ${
                      minRating === stars ? 'text-ink-900' : 'text-ink-600 hover:text-ink-900'
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
                    {minRating === stars && (
                      <span className="ml-auto text-[10px] text-accent-700">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* divider */}
            <div className="border-t border-line-100" />

            {/* POPULAR TAGS */}
            {popularTags.length > 0 && (
              <div>
                <p className="text-[10px] font-[600] uppercase tracking-[0.05em] text-ink-400 mb-2">
                  Popular Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {popularTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
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
            )}
          </aside>

          {/* ── RIGHT: Card grid ── */}
          <div className="min-w-0">
            {/* Result count when no active filter chips row */}
            {!hasActiveFilters && (
              <div className="flex items-center justify-end mb-3">
                <span className="text-xs text-ink-400 tabular-nums">
                  {pagination?.total ?? prompts.length} results
                </span>
              </div>
            )}

            {isPending && prompts.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-ink-400" />
              </div>
            ) : prompts.length === 0 ? (
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
              <div className={`grid grid-cols-2 gap-4 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
                {prompts.map((prompt) => (
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
