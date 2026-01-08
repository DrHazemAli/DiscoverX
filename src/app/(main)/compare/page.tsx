/**
 * ============================================================================
 * DISCOVER: Compare Page
 * Description: Side-by-side repository comparison
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
  LanguageBadge,
  ScoreBadge,
  Spinner,
} from '@/components/ui';
import { useCompareQuery } from '@/lib/query';
import {
  GitCompare,
  Plus,
  Star,
  GitFork,
  Eye,
  AlertCircle,
  Calendar,
  Trophy,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// Compare Page Component
// ============================================================================

export default function ComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse repos from URL
  const reposParam = searchParams.get('repos');
  const repos = reposParam ? reposParam.split(',').filter(Boolean) : [];

  // Local state for new repo input
  const [newRepo, setNewRepo] = React.useState('');
  const [inputError, setInputError] = React.useState<string | null>(null);

  // Fetch comparison data
  const { data, isLoading, error } = useCompareQuery(repos, {
    enabled: repos.length >= 2,
  });

  // Add repository to comparison
  const addRepo = () => {
    const trimmed = newRepo.trim();

    // Validate format (owner/name or full URL)
    let repoName = trimmed;
    if (trimmed.includes('github.com/')) {
      const match = trimmed.match(/github\.com\/([^/]+\/[^/]+)/);
      if (match) {
        repoName = match[1].replace(/\.git$/, '');
      }
    }

    if (!repoName.includes('/')) {
      setInputError('Please enter a valid repository (owner/name)');
      return;
    }

    if (repos.includes(repoName)) {
      setInputError('Repository already added');
      return;
    }

    if (repos.length >= 5) {
      setInputError('Maximum 5 repositories allowed');
      return;
    }

    const newRepos = [...repos, repoName];
    router.push(`/compare?repos=${newRepos.join(',')}`);
    setNewRepo('');
    setInputError(null);
  };

  // Remove repository from comparison
  const removeRepo = (repo: string) => {
    const newRepos = repos.filter((r) => r !== repo);
    if (newRepos.length > 0) {
      router.push(`/compare?repos=${newRepos.join(',')}`);
    } else {
      router.push('/compare');
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addRepo();
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Compare Repositories
        </h1>
        <p className="text-muted-foreground">
          Compare up to 5 repositories side-by-side to make informed decisions
        </p>
      </div>

      {/* Repository input */}
      <Card padding="md" className="mb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Enter repository (e.g., facebook/react or GitHub URL)"
              value={newRepo}
              onChange={(e) => {
                setNewRepo(e.target.value);
                setInputError(null);
              }}
              onKeyDown={handleKeyDown}
              error={inputError ?? undefined}
            />
          </div>
          <Button
            onClick={addRepo}
            disabled={!newRepo.trim() || repos.length >= 5}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Repository
          </Button>
        </div>

        {/* Selected repos */}
        {repos.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {repos.map((repo) => (
              <Badge
                key={repo}
                variant="primary"
                size="lg"
                removable
                onRemove={() => removeRepo(repo)}
              >
                {repo}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* Empty state */}
      {repos.length < 2 && (
        <Card padding="lg" className="text-center">
          <GitCompare className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Add repositories to compare
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Enter at least 2 repositories above to see a detailed comparison of their
            health scores, activity, and metrics.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="text-sm text-muted-foreground">Try:</span>
            {['facebook/react', 'vuejs/vue', 'angular/angular'].map((repo) => (
              <button
                key={repo}
                onClick={() => {
                  const newRepos = [...repos, repo];
                  router.push(`/compare?repos=${newRepos.join(',')}`);
                }}
                disabled={repos.includes(repo)}
                className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
              >
                {repo}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Loading */}
      {repos.length >= 2 && isLoading && (
        <Card padding="lg" className="text-center">
          <Spinner size="lg" className="mx-auto mb-4" />
          <p className="text-muted-foreground">
            Loading comparison data...
          </p>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card padding="lg" className="text-center">
          <p className="text-destructive">
            Error loading comparison: {error.message}
          </p>
        </Card>
      )}

      {/* Comparison results */}
      {data && (
        <div className="space-y-8">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Highest Scored
                  </div>
                  <div className="font-semibold text-foreground">
                    {data.summary.highestScored || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Average Score
                  </div>
                  <div className="font-semibold text-foreground">
                    {data.summary.averageScore.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Repositories Compared
                  </div>
                  <div className="font-semibold text-foreground">
                    {data.summary.totalFound} / {data.summary.totalRequested}
                  </div>
                </div>
              </div>
              {data.summary.notFound.length > 0 && (
                <p className="mt-4 text-sm text-amber-500">
                  Not found: {data.summary.notFound.join(', ')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-4 font-medium text-muted-foreground w-48">
                    Metric
                  </th>
                  {data.repositories.map((repo) => (
                    <th
                      key={repo.fullName}
                      className="text-center py-4 px-4 font-medium text-foreground min-w-[180px]"
                    >
                      <a
                        href={`/repos/${repo.owner}/${repo.name}`}
                        className="hover:text-primary"
                      >
                        {repo.fullName}
                      </a>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {/* Health Score */}
                <tr className="bg-primary/10">
                  <td className="py-4 px-4 font-medium text-foreground">
                    Health Score
                  </td>
                  {data.repositories.map((repo) => (
                    <td key={repo.fullName} className="py-4 px-4 text-center">
                      {repo.score ? (
                        <ScoreBadge score={repo.score.overallScore} />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Language */}
                <tr>
                  <td className="py-4 px-4 text-muted-foreground">Language</td>
                  {data.repositories.map((repo) => (
                    <td key={repo.fullName} className="py-4 px-4 text-center">
                      {repo.language ? (
                        <LanguageBadge language={repo.language} />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Stars */}
                <tr>
                  <td className="py-4 px-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Stars
                    </div>
                  </td>
                  {data.repositories.map((repo) => (
                    <td key={repo.fullName} className="py-4 px-4 text-center font-medium">
                      {repo.starsCount.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* Forks */}
                <tr>
                  <td className="py-4 px-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <GitFork className="h-4 w-4" />
                      Forks
                    </div>
                  </td>
                  {data.repositories.map((repo) => (
                    <td key={repo.fullName} className="py-4 px-4 text-center">
                      {repo.forksCount.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* Watchers */}
                <tr>
                  <td className="py-4 px-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Watchers
                    </div>
                  </td>
                  {data.repositories.map((repo) => (
                    <td key={repo.fullName} className="py-4 px-4 text-center">
                      {repo.watchersCount.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* Open Issues */}
                <tr>
                  <td className="py-4 px-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Open Issues
                    </div>
                  </td>
                  {data.repositories.map((repo) => (
                    <td key={repo.fullName} className="py-4 px-4 text-center">
                      {repo.openIssuesCount.toLocaleString()}
                    </td>
                  ))}
                </tr>

                {/* Score dimensions */}
                {['Activity', 'Community', 'Maintenance', 'Popularity', 'Quality'].map((dim) => (
                  <tr key={dim}>
                    <td className="py-4 px-4 text-muted-foreground">
                      {dim} Score
                    </td>
                    {data.repositories.map((repo) => {
                      const key = `${dim.toLowerCase()}Score` as keyof NonNullable<typeof repo.score>;
                      const score = repo.score?.[key];
                      return (
                        <td key={repo.fullName} className="py-4 px-4 text-center">
                          {score !== undefined ? (
                            <span className="font-medium">{Math.round(score)}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Last Updated */}
                <tr>
                  <td className="py-4 px-4 text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Last Updated
                    </div>
                  </td>
                  {data.repositories.map((repo) => (
                    <td key={repo.fullName} className="py-4 px-4 text-center text-sm">
                      {repo.githubPushedAt
                        ? formatDistanceToNow(new Date(repo.githubPushedAt), { addSuffix: true })
                        : '-'}
                    </td>
                  ))}
                </tr>

                {/* License */}
                <tr>
                  <td className="py-4 px-4 text-muted-foreground">License</td>
                  {data.repositories.map((repo) => (
                    <td key={repo.fullName} className="py-4 px-4 text-center">
                      {repo.licenseKey ? (
                        <Badge variant="default" size="sm">
                          {repo.licenseKey.toUpperCase()}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
