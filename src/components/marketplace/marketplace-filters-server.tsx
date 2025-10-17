import Link from 'next/link';
import { Search } from 'lucide-react';

interface SharedPromptsFiltersProps {
  searchQuery: string;
  selectedTags: string[];
  sortBy: 'recent' | 'popular' | 'liked' | 'copied';
  availableTags: Array<{ id: string; name: string; count: number }>;
}

export function SharedPromptsFilters({
  searchQuery,
  selectedTags,
  sortBy,
  availableTags
}: SharedPromptsFiltersProps) {
  // Helper function to build query string
  const buildQueryString = (updates: Record<string, string | string[] | undefined>) => {
    const params = new URLSearchParams();

    // Start with current values
    if (searchQuery) params.set('search', searchQuery);
    if (selectedTags.length) params.set('tags', selectedTags.join(','));
    if (sortBy !== 'recent') params.set('sort', sortBy);

    // Apply updates
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined) {
        params.delete(key);
      } else if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','));
        } else {
          params.delete(key);
        }
      } else if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  };

  // Helper to toggle a tag
  const getToggleTagUrl = (tagId: string) => {
    const newTags = selectedTags.includes(tagId)
      ? selectedTags.filter(t => t !== tagId)
      : [...selectedTags, tagId];
    return buildQueryString({ tags: newTags });
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form action="/shared-prompts" method="GET">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            name="search"
            placeholder="Search prompts..."
            defaultValue={searchQuery}
            className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#546ee5] focus:border-transparent"
          />
          {/* Preserve other params */}
          {selectedTags.length > 0 && (
            <input type="hidden" name="tags" value={selectedTags.join(',')} />
          )}
          {sortBy !== 'recent' && (
            <input type="hidden" name="sort" value={sortBy} />
          )}
        </div>
      </form>

      {/* Sort Options */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground">Sort By</h3>
        <div className="flex flex-col gap-1">
          {[
            { value: 'recent' as const, label: 'Most Recent' },
            { value: 'popular' as const, label: 'Most Popular' },
            { value: 'liked' as const, label: 'Most Liked' },
            { value: 'copied' as const, label: 'Most Copied' },
          ].map((option) => (
            <Link
              key={option.value}
              href={buildQueryString({ sort: option.value === 'recent' ? undefined : option.value })}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                sortBy === option.value
                  ? 'bg-[#546ee5] text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Tag Filter */}
      {availableTags.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Filter by Tags</h3>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {availableTags.map((tag) => (
              <Link
                key={tag.id}
                href={getToggleTagUrl(tag.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedTags.includes(tag.id)
                    ? 'bg-[#546ee5] text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span>{tag.name}</span>
                <span className={`text-xs ${
                  selectedTags.includes(tag.id) ? 'text-white/80' : 'text-muted-foreground'
                }`}>
                  {tag.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Clear Filters */}
      {(searchQuery || selectedTags.length > 0 || sortBy !== 'recent') && (
        <Link
          href="/shared-prompts"
          className="block w-full px-3 py-2 text-center text-sm text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          Clear All Filters
        </Link>
      )}
    </div>
  );
}