'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  X, 
  TrendingUp, 
  Clock, 
  Heart, 
  Copy,
  Filter
} from 'lucide-react';

interface MarketplaceFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  sortBy: 'recent' | 'popular' | 'liked' | 'copied';
  onSortChange: (sort: 'recent' | 'popular' | 'liked' | 'copied') => void;
  availableTags: Array<{ id: string; name: string; count: number }>;
  className?: string;
}

const sortOptions = [
  { value: 'recent', label: 'Recent', icon: Clock },
  { value: 'popular', label: 'Popular', icon: TrendingUp },
  { value: 'liked', label: 'Most Liked', icon: Heart },
  { value: 'copied', label: 'Most Copied', icon: Copy },
];

export function MarketplaceFilters({
  searchQuery,
  onSearchChange,
  selectedTags,
  onTagToggle,
  sortBy,
  onSortChange,
  availableTags,
  className
}: MarketplaceFiltersProps) {
  const clearAllFilters = () => {
    onSearchChange('');
    selectedTags.forEach(tag => onTagToggle(tag));
    onSortChange('recent');
  };

  const hasActiveFilters = searchQuery.length > 0 || selectedTags.length > 0 || sortBy !== 'recent';

  return (
    <div className={`space-y-4 flex flex-col h-full ${className || ''}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search prompts..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Sort Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Sort by</span>
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs h-6"
            >
              Clear all
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {sortOptions.map((option) => {
            const Icon = option.icon;
            const isActive = sortBy === option.value;
            return (
              <Button
                key={option.value}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onSortChange(option.value as 'recent' | 'popular' | 'liked' | 'copied')}
                className={`justify-start text-xs h-8 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#6379c3] to-[#546ee5] text-white border-0' 
                    : 'hover:bg-muted'
                }`}
              >
                <Icon className="w-3 h-3 mr-2" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Tag Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter by tags</span>
        </div>

        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Selected:</span>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="default"
                  className="cursor-pointer text-xs bg-gradient-to-r from-[#6379c3] to-[#546ee5] text-white border-0"
                  onClick={() => onTagToggle(tag)}
                >
                  {tag}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Available Tags */}
        {availableTags.length > 0 && (
          <div className="space-y-2 flex-1">
            <span className="text-xs text-muted-foreground">Popular tags:</span>
            <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto">
              {availableTags
                .filter(tag => !selectedTags.includes(tag.name))
                .slice(0, 50)
                .map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="secondary"
                    className="cursor-pointer text-xs hover:bg-muted transition-colors"
                    onClick={() => onTagToggle(tag.name)}
                  >
                    {tag.name}
                    <span className="ml-1 text-xs text-muted-foreground">({tag.count})</span>
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          {searchQuery && (
            <span>Search: &ldquo;{searchQuery}&rdquo; • </span>
          )}
          {selectedTags.length > 0 && (
            <span>{selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected • </span>
          )}
          <span>Sorted by {sortOptions.find(opt => opt.value === sortBy)?.label}</span>
        </div>
      )}
    </div>
  );
}