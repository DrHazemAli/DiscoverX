/**
 * ============================================================================
 * DISCOVER: Search Page
 * Description: Repository search with filters and results
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  SearchInput,
  Button,
  Card,
  RepositoryCard,
  CardSkeletonList,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui';
import { useSearch } from '@/lib/query';
import { Search, SlidersHorizontal, X } from 'lucide-react';

// ============================================================================
// Filter Options
// ============================================================================

const languageOptions = [
  { value: 'all', label: 'All Languages' },
  { value: 'TypeScript', label: 'TypeScript' },
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'Python', label: 'Python' },
  { value: 'Rust', label: 'Rust' },
  { value: 'Go', label: 'Go' },
  { value: 'Java', label: 'Java' },
  { value: 'C++', label: 'C++' },
  { value: 'Ruby', label: 'Ruby' },
  { value: 'PHP', label: 'PHP' },
  { value: 'Swift', label: 'Swift' },
];

const sortOptions = [
  { value: 'score', label: 'Best Match' },
  { value: 'stars', label: 'Stars' },
  { value: 'forks', label: 'Forks' },
  { value: 'updated', label: 'Recently Updated' },
];

const minStarsOptions = [
  { value: '0', label: 'Any Stars' },
  { value: '100', label: '100+ Stars' },
  { value: '1000', label: '1K+ Stars' },
  { value: '5000', label: '5K+ Stars' },
  { value: '10000', label: '10K+ Stars' },
];

// ============================================================================
// Search Page Component
// ============================================================================

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract search params
  const query = searchParams.get('q') || '';
  const language = searchParams.get('language') || 'all';
  const sort = searchParams.get('sort') || 'score';
  const minStars = searchParams.get('minStars') || '0';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Local state for input
  const [searchInput, setSearchInput] = React.useState(query);
  const [showFilters, setShowFilters] = React.useState(false);

  // Fetch search results
  const { data, isLoading, error } = useSearch({
    q: query,
    language: language !== 'all' ? language : undefined,
    sort,
    minStars: parseInt(minStars, 10) || undefined,
    page,
    limit: 20,
  });

  // Update URL with search params
  const updateSearch = React.useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== '0') {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      });
      // Reset page when filters change (except for pagination)
      if (!('page' in params)) {
        newParams.delete('page');
      }
      router.push(`/search?${newParams.toString()}`);
    },
    [router, searchParams]
  );

  // Handle search submit
  const handleSearch = (value: string) => {
    updateSearch({ q: value });
  };

  // Handle filter changes
  const handleLanguageChange = (value: string) => {
    updateSearch({ language: value });
  };

  const handleSortChange = (value: string) => {
    updateSearch({ sort: value });
  };

  const handleMinStarsChange = (value: string) => {
    updateSearch({ minStars: value });
  };

  // Clear all filters
  const clearFilters = () => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const hasActiveFilters = language !== 'all' || minStars !== '0' || sort !== 'score';

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 bg-background text-foreground">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Search Repositories
        </h1>
        <p className="text-muted-foreground">
          Find open source repositories with health scores and analytics
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-8 space-y-4">
        {/* Search input */}
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchInput
              placeholder="Search repositories (e.g., react, machine learning, cli tool)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onSearch={handleSearch}
              inputSize="lg"
            />
          </div>
          <Button
            variant="outline"
            size="lg"
            leftIcon={<SlidersHorizontal className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-accent' : ''}
          >
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                !
              </span>
            )}
          </Button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <Card padding="md" className="animate-slide-down">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Language filter */}
              <div className="w-48">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Language
                </label>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min stars filter */}
              <div className="w-48">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Minimum Stars
                </label>
                <Select value={minStars} onValueChange={handleMinStarsChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {minStarsOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort by */}
              <div className="w-48">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Sort By
                </label>
                <Select value={sort} onValueChange={handleSortChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="md"
                  leftIcon={<X className="h-4 w-4" />}
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Results */}
      <div>
        {/* Empty state - no query */}
        {!query && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              Search for repositories
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter a search query to discover open source repositories with health scores
              and analytics.
            </p>
          </div>
        )}

        {/* Loading state */}
        {query && isLoading && <CardSkeletonList count={5} />}

        {/* Error state */}
        {query && error && (
          <Card padding="lg" className="text-center">
            <p className="text-destructive">
              Error loading results: {error.message}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.refresh()}
            >
              Try Again
            </Button>
          </Card>
        )}

        {/* Results */}
        {query && data && (
          <>
            {/* Results header */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {(data.total ?? 0).toLocaleString()} repositories found
              </p>
            </div>

            {/* Results list */}
            {data.results && data.results.length > 0 ? (
              <div className="space-y-4">
                {data.results.map((repo) => (
                  <RepositoryCard
                    key={repo.fullName}
                    repository={{
                      ...repo,
                      topics: repo.topics || [],
                    }}
                    variant="default"
                  />
                ))}
              </div>
            ) : (
              <Card padding="lg" className="text-center">
                <p className="text-muted-foreground">
                  No repositories found matching your search.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              </Card>
            )}

            {/* Pagination */}
            {data.total > 20 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => updateSearch({ page: String(page - 1) })}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {page} of {Math.ceil(data.total / 20)}
                </span>
                <Button
                  variant="outline"
                  disabled={page * 20 >= data.total}
                  onClick={() => updateSearch({ page: String(page + 1) })}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
