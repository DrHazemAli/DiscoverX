/**
 * ============================================================================
 * DISCOVER: Compare Use Case
 * Description: Compare multiple repositories side by side
 * ============================================================================
 */

import 'server-only';
import type { Repository, RepositoryScore } from '@/core/types';
import { getRepositoryProfile } from './repository';

// ============================================================================
// TYPES
// ============================================================================

export interface CompareParams {
  repos: string[]; // Array of "owner/name" strings
  metrics?: string[];
}

export interface ComparedRepository {
  repository: Repository;
  score: RepositoryScore | null;
  recentSnapshot: {
    snapshotDate: string;
    starsCount: number;
    forksCount: number;
    watchersCount: number;
    openIssuesCount: number;
    commitsLast30d: number;
    prsOpenedLast30d: number;
    prsMergedLast30d: number;
    issuesOpenedLast30d: number;
    issuesClosedLast30d: number;
    contributorsCount: number;
  } | null;
}

export interface CompareResult {
  repositories: ComparedRepository[];
  comparedAt: string;
}

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Compare multiple repositories
 */
export async function compareRepositories(params: CompareParams): Promise<CompareResult> {
  const { repos } = params;

  // Parse repository identifiers and fetch each
  const results: ComparedRepository[] = [];

  for (const repoStr of repos) {
    const [owner, name] = repoStr.split('/');
    
    if (!owner || !name) {
      continue;
    }

    // Get repository profile (will fetch from GitHub if needed)
    const profile = await getRepositoryProfile(owner, name);
    
    if (!profile) {
      continue;
    }

    // Get latest snapshot with all metrics
    const snapshot = profile.latestSnapshot;

    results.push({
      repository: profile.repository,
      score: profile.score,
      recentSnapshot: snapshot ? {
        snapshotDate: snapshot.snapshotDate.toISOString().split('T')[0]!,
        starsCount: snapshot.starsCount,
        forksCount: snapshot.forksCount,
        watchersCount: snapshot.watchersCount,
        openIssuesCount: snapshot.openIssuesCount,
        commitsLast30d: snapshot.commitsLast30d,
        prsOpenedLast30d: snapshot.prsOpenedLast30d,
        prsMergedLast30d: snapshot.prsMergedLast30d,
        issuesOpenedLast30d: snapshot.issuesOpenedLast30d,
        issuesClosedLast30d: snapshot.issuesClosedLast30d,
        contributorsCount: snapshot.contributorsCount,
      } : null,
    });
  }

  return {
    repositories: results,
    comparedAt: new Date().toISOString(),
  };
}

/**
 * Get comparison metrics definition
 */
export function getComparisonMetrics() {
  return [
    {
      id: 'overall_score',
      name: 'Overall Score',
      description: 'Combined health score (0-100)',
      category: 'score',
    },
    {
      id: 'activity_score',
      name: 'Activity Score',
      description: 'Development activity score',
      category: 'score',
    },
    {
      id: 'community_score',
      name: 'Community Score',
      description: 'Community engagement score',
      category: 'score',
    },
    {
      id: 'stars',
      name: 'Stars',
      description: 'Total GitHub stars',
      category: 'popularity',
    },
    {
      id: 'forks',
      name: 'Forks',
      description: 'Total GitHub forks',
      category: 'popularity',
    },
    {
      id: 'commits_30d',
      name: 'Commits (30d)',
      description: 'Commits in last 30 days',
      category: 'activity',
    },
    {
      id: 'prs_30d',
      name: 'PRs (30d)',
      description: 'Pull requests in last 30 days',
      category: 'activity',
    },
    {
      id: 'contributors',
      name: 'Contributors',
      description: 'Total contributors',
      category: 'community',
    },
    {
      id: 'issues_30d',
      name: 'Issues (30d)',
      description: 'Issues activity in last 30 days',
      category: 'activity',
    },
  ];
}
