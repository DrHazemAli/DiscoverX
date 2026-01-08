/**
 * ============================================================================
 * DISCOVER: Repository Detail Page
 * Description: Detailed repository profile with scores, charts, and insights
 * ============================================================================
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  LanguageBadge,
  ScoreBreakdown,
  ScoreBadge,
  LineChart,
  AreaChart,
  chartColors,
  PageLoading,
  CardSkeleton,
} from '@/components/ui';
import { useRepository, useTimeSeries, useAlternatives } from '@/lib/query';
import {
  Star,
  GitFork,
  Eye,
  AlertCircle,
  ExternalLink,
  Calendar,
  Clock,
  Users,
  GitCommit,
  GitPullRequest,
  CheckCircle,
  Globe,
  FileText,
  Scale,
  Archive,
  MessageSquare,
  GitCompare,
  TrendingUp,
  ArrowLeft,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

// ============================================================================
// Repository Detail Page Component
// ============================================================================

export default function RepositoryDetailPage() {
  const params = useParams();
  const owner = params.owner as string;
  const name = params.name as string;

  // Fetch repository data
  const { data: repoData, isLoading: repoLoading, error: repoError } = useRepository(owner, name);

  // Fetch time series data
  const { data: timeSeriesData } = useTimeSeries(owner, name, 90);

  // Fetch alternatives
  const { data: alternativesData, isLoading: alternativesLoading } = useAlternatives(owner, name, 5);

  // Loading state
  if (repoLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <PageLoading message="Loading repository..." />
      </div>
    );
  }

  // Error state
  if (repoError || !repoData) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <Card padding="lg" className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Repository not found
          </h2>
          <p className="text-muted-foreground mb-4">
            The repository {owner}/{name} could not be found.
          </p>
          <Link href="/search">
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Search
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { repository, score, ranking, snapshot } = repoData;

  // Prepare chart data
  const chartData = timeSeriesData?.snapshots.map((s) => ({
    date: format(new Date(s.date), 'MMM d'),
    stars: s.starsCount,
    forks: s.forksCount,
  })) ?? [];

  const scoreChartData = timeSeriesData?.scores.map((s) => ({
    date: format(new Date(s.date), 'MMM d'),
    overall: s.overallScore,
    activity: s.activityScore,
    community: s.communityScore,
    maintenance: s.maintenanceScore,
  })) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link
          href="/search"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Link>
      </nav>

      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-8 mb-8">
        {/* Main info */}
        <div className="flex-1">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">
                  {repository.fullName}
                </h1>
                {repository.isArchived && (
                  <Badge variant="warning">
                    <Archive className="h-3 w-3 mr-1" />
                    Archived
                  </Badge>
                )}
              </div>
              {repository.description && (
                <p className="text-muted-foreground text-lg mb-4">
                  {repository.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {repository.language && (
                  <LanguageBadge language={repository.language} />
                )}
                {repository.topics?.slice(0, 5).map((topic) => (
                  <Badge key={topic} variant="default" size="sm">
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="font-semibold text-foreground">
                {repository.starsCount.toLocaleString()}
              </span>
              <span>stars</span>
            </div>
            <div className="flex items-center gap-2">
              <GitFork className="h-5 w-5" />
              <span className="font-semibold text-foreground">
                {repository.forksCount.toLocaleString()}
              </span>
              <span>forks</span>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              <span className="font-semibold text-foreground">
                {repository.watchersCount.toLocaleString()}
              </span>
              <span>watchers</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold text-foreground">
                {repository.openIssuesCount.toLocaleString()}
              </span>
              <span>issues</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mt-6">
            <a
              href={`https://github.com/${repository.fullName}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button leftIcon={<ExternalLink className="h-4 w-4" />}>
                View on GitHub
              </Button>
            </a>
            {repository.homepageUrl && (
              <a href={repository.homepageUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" leftIcon={<Globe className="h-4 w-4" />}>
                  Website
                </Button>
              </a>
            )}
            <Link href={`/compare?repos=${repository.fullName}`}>
              <Button variant="outline" leftIcon={<GitCompare className="h-4 w-4" />}>
                Compare
              </Button>
            </Link>
          </div>
        </div>

        {/* Health score card */}
        {score && (
          <Card className="lg:w-80 shrink-0">
            <CardHeader>
              <CardTitle>Health Score</CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreBreakdown
                overallScore={score.overallScore}
                activityScore={score.activityScore}
                communityScore={score.communityScore}
                maintenanceScore={score.maintenanceScore}
                popularityScore={score.popularityScore}
                qualityScore={score.qualityScore}
              />
              {ranking && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Overall Rank
                    </span>
                    <span className="font-semibold text-foreground">
                      #{ranking.rank}
                    </span>
                  </div>
                  {ranking.rankChange !== null && ranking.rankChange !== 0 && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-muted-foreground">
                        Change
                      </span>
                      <span
                        className={`flex items-center gap-1 font-medium ${
                          ranking.rankChange > 0
                            ? 'text-green-500'
                            : 'text-red-500'
                        }`}
                      >
                        <TrendingUp className="h-4 w-4" />
                        {ranking.rankChange > 0 ? '+' : ''}
                        {ranking.rankChange}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left column - Charts and activity */}
        <div className="lg:col-span-2 space-y-8">
          {/* Growth chart */}
          {chartData.length > 0 && (
            <AreaChart
              title="Growth Over Time"
              data={chartData}
              series={[
                { key: 'stars', name: 'Stars', color: chartColors.warning, gradient: true },
                { key: 'forks', name: 'Forks', color: chartColors.info, gradient: true },
              ]}
              height={300}
            />
          )}

          {/* Score history */}
          {scoreChartData.length > 0 && (
            <LineChart
              title="Score History"
              data={scoreChartData}
              series={[
                { key: 'overall', name: 'Overall', color: chartColors.primary },
                { key: 'activity', name: 'Activity', color: chartColors.success },
                { key: 'community', name: 'Community', color: chartColors.info },
                { key: 'maintenance', name: 'Maintenance', color: chartColors.warning },
              ]}
              height={300}
            />
          )}

          {/* Recent activity */}
          {snapshot && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity (Last 30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {snapshot.contributorsCount !== null && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Users className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {snapshot.contributorsCount}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Contributors
                        </div>
                      </div>
                    </div>
                  )}
                  {snapshot.commitsLast30d !== null && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <GitCommit className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {snapshot.commitsLast30d}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Commits
                        </div>
                      </div>
                    </div>
                  )}
                  {snapshot.prsOpenedLast30d !== null && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        <GitPullRequest className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {snapshot.prsOpenedLast30d}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          PRs Opened
                        </div>
                      </div>
                    </div>
                  )}
                  {snapshot.prsMergedLast30d !== null && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/20">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {snapshot.prsMergedLast30d}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          PRs Merged
                        </div>
                      </div>
                    </div>
                  )}
                  {snapshot.issuesOpenedLast30d !== null && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/20">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {snapshot.issuesOpenedLast30d}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Issues Opened
                        </div>
                      </div>
                    </div>
                  )}
                  {snapshot.issuesClosedLast30d !== null && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-teal-500/20">
                        <CheckCircle className="h-5 w-5 text-teal-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {snapshot.issuesClosedLast30d}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Issues Closed
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Info and alternatives */}
        <div className="space-y-8">
          {/* Repository info */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                {repository.licenseName && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Scale className="h-4 w-4" />
                      License
                    </dt>
                    <dd className="font-medium text-foreground">
                      {repository.licenseName}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    Wiki
                  </dt>
                  <dd className="font-medium text-foreground">
                    {repository.hasWiki ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    Issues
                  </dt>
                  <dd className="font-medium text-foreground">
                    {repository.hasIssues ? 'Enabled' : 'Disabled'}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Discussions
                  </dt>
                  <dd className="font-medium text-foreground">
                    {repository.hasDiscussions ? 'Enabled' : 'Disabled'}
                  </dd>
                </div>
                {repository.githubCreatedAt && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Created
                    </dt>
                    <dd className="font-medium text-foreground">
                      {format(new Date(repository.githubCreatedAt), 'MMM d, yyyy')}
                    </dd>
                  </div>
                )}
                {repository.githubPushedAt && (
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Last push
                    </dt>
                    <dd className="font-medium text-foreground">
                      {formatDistanceToNow(new Date(repository.githubPushedAt), { addSuffix: true })}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Alternatives */}
          <Card>
            <CardHeader>
              <CardTitle>Similar Repositories</CardTitle>
            </CardHeader>
            <CardContent>
              {alternativesLoading ? (
                <div className="space-y-3">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : alternativesData?.alternatives.length ? (
                <div className="space-y-3">
                  {alternativesData.alternatives.slice(0, 5).map((alt) => (
                    <Link
                      key={alt.repository.fullName}
                      href={`/repos/${alt.repository.owner}/${alt.repository.name}`}
                      className="block p-3 rounded-lg border border-border hover:border-muted-foreground/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground text-sm">
                          {alt.repository.fullName}
                        </span>
                        {alt.score && (
                          <ScoreBadge score={alt.score.overallScore} />
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {alt.repository.starsCount.toLocaleString()}
                        </span>
                        <span>{Math.round(alt.similarity.overall * 100)}% similar</span>
                      </div>
                    </Link>
                  ))}
                  <Link
                    href={`/repos/${owner}/${name}/alternatives`}
                    className="block text-center text-sm text-primary hover:text-primary/80 py-2"
                  >
                    View all alternatives →
                  </Link>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No similar repositories found.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
