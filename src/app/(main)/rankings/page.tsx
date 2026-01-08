/**
 * ============================================================================
 * DISCOVER: Rankings Page
 * Description: Repository rankings by various criteria
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  Button,
  RepositoryCard,
  CardSkeletonList,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui';
import { useRankings } from '@/lib/query';
import { Trophy, Flame, Rocket, Calendar } from 'lucide-react';

// ============================================================================
// Ranking Types
// ============================================================================

const rankingTypes = [
  { value: 'overall', label: 'Overall', icon: Trophy, description: 'Best overall health score' },
  { value: 'activity', label: 'Activity', icon: Flame, description: 'Most active development' },
  { value: 'community', label: 'Community', icon: Rocket, description: 'Strongest community engagement' },
  { value: 'popularity', label: 'Popularity', icon: Trophy, description: 'Most popular repositories' },
  { value: 'maintenance', label: 'Maintenance', icon: Calendar, description: 'Best maintained projects' },
  { value: 'quality', label: 'Quality', icon: Trophy, description: 'Highest code quality' },
];

const periodOptions = [
  { value: 'daily', label: 'Today' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
];

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
  { value: 'Swift', label: 'Swift' },
  { value: 'Kotlin', label: 'Kotlin' },
];

// ============================================================================
// Rankings Page Component
// ============================================================================

export default function RankingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract params
  const type = searchParams.get('type') || 'overall';
  const period = searchParams.get('period') || 'weekly';
  const language = searchParams.get('language') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Fetch rankings
  const { data, isLoading, error } = useRankings({
    type,
    period,
    language: language !== 'all' ? language : undefined,
    page,
    limit: 20,
  });

  // Update URL
  const updateParams = React.useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== 'all') {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      });
      if (!('page' in params)) {
        newParams.delete('page');
      }
      router.push(`/rankings?${newParams.toString()}`);
    },
    [router, searchParams]
  );

  const selectedType = rankingTypes.find((t) => t.value === type) || rankingTypes[0];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Repository Rankings
        </h1>
        <p className="text-muted-foreground">
          Discover top repositories by health score, trending projects, and rising stars
        </p>
      </div>

      {/* Ranking type selector */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {rankingTypes.map((rankType) => {
          const Icon = rankType.icon;
          const isActive = type === rankType.value;

          return (
            <button
              key={rankType.value}
              onClick={() => updateParams({ type: rankType.value })}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                isActive
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-muted-foreground/50'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div
                  className={`font-semibold ${
                    isActive ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {rankType.label}
                </div>
                <div className="text-sm text-muted-foreground">
                  {rankType.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <Card padding="md" className="mb-8">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Period selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={period} onValueChange={(v) => updateParams({ period: v })}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Language selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Language:</span>
            <Select value={language} onValueChange={(v) => updateParams({ language: v })}>
              <SelectTrigger className="w-40">
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

          {/* Available languages */}
          {data?.metadata.availableLanguages && data.metadata.availableLanguages.length > 0 && (
            <div className="flex-1 flex flex-wrap gap-2 justify-end">
              {data.metadata.availableLanguages.slice(0, 5).map((lang) => (
                <button
                  key={lang}
                  onClick={() => updateParams({ language: lang })}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    language === lang
                      ? 'bg-primary/20 text-primary'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Rankings list */}
      <div>
        {/* Loading */}
        {isLoading && <CardSkeletonList count={10} />}

        {/* Error */}
        {error && (
          <Card padding="lg" className="text-center">
            <p className="text-destructive">
              Error loading rankings: {error.message}
            </p>
          </Card>
        )}

        {/* Results */}
        {data && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <selectedType.icon className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">
                  {selectedType.label} Rankings
                </span>
                {data.filters.language && (
                  <span className="text-muted-foreground">
                    • {data.filters.language}
                  </span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                Updated: {data.metadata.asOf}
              </span>
            </div>

            {/* Rankings */}
            {data.rankings.length > 0 ? (
              <div className="space-y-3">
                {data.rankings.map((item) => (
                  <RepositoryCard
                    key={item.repository.fullName}
                    repository={{
                      ...item.repository,
                      score: item.score,
                      ranking: {
                        rank: item.rank,
                        rankChange: item.rankChange,
                      },
                    }}
                    variant="compact"
                    showRank
                  />
                ))}
              </div>
            ) : (
              <Card padding="lg" className="text-center">
                <Trophy className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No rankings available for the selected filters.
                </p>
              </Card>
            )}

            {/* Pagination */}
            {data.pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => updateParams({ page: String(page - 1) })}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-sm text-muted-foreground">
                  Page {page} of {data.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={!data.pagination.hasMore}
                  onClick={() => updateParams({ page: String(page + 1) })}
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
