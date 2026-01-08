/**
 * ============================================================================
 * DISCOVER: Snapshots Repository
 * Description: Data access layer for repository snapshot operations
 * ============================================================================
 */

import 'server-only';
import type { RepositorySnapshot, MetricTimeSeries, DateRange } from '@/core/types';
import { getAdminClient, type DbRepositorySnapshot } from './db';

// ============================================================================
// MAPPER FUNCTIONS
// ============================================================================

/**
 * Map database row to domain RepositorySnapshot
 */
function mapToSnapshot(row: DbRepositorySnapshot): RepositorySnapshot {
  return {
    id: row.id,
    repositoryId: row.repository_id,
    snapshotDate: new Date(row.snapshot_date),
    starsCount: row.stars_count,
    forksCount: row.forks_count,
    watchersCount: row.watchers_count,
    openIssuesCount: row.open_issues_count,
    commitsCount: row.commits_count,
    contributorsCount: row.contributors_count,
    releasesCount: row.releases_count,
    commitsLast30d: row.commits_last_30d,
    prsOpenedLast30d: row.prs_opened_last_30d,
    prsMergedLast30d: row.prs_merged_last_30d,
    issuesOpenedLast30d: row.issues_opened_last_30d,
    issuesClosedLast30d: row.issues_closed_last_30d,
    createdAt: new Date(row.created_at),
  };
}

// ============================================================================
// SNAPSHOT QUERIES
// ============================================================================

/**
 * Get the latest snapshot for a repository
 */
export async function getLatestSnapshot(
  repositoryId: string
): Promise<RepositorySnapshot | null> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('repository_snapshots')
    .select('*')
    .eq('repository_id', repositoryId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return mapToSnapshot(data as DbRepositorySnapshot);
}

/**
 * Get snapshots for a repository within a date range
 */
export async function getSnapshotsByDateRange(
  repositoryId: string,
  dateRange: DateRange
): Promise<RepositorySnapshot[]> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('repository_snapshots')
    .select('*')
    .eq('repository_id', repositoryId)
    .gte('snapshot_date', dateRange.start.toISOString().split('T')[0])
    .lte('snapshot_date', dateRange.end.toISOString().split('T')[0])
    .order('snapshot_date', { ascending: true });

  if (error || !data) return [];
  return (data as DbRepositorySnapshot[]).map(mapToSnapshot);
}

/**
 * Get recent snapshots for scoring (last N days)
 */
export async function getRecentSnapshots(
  repositoryId: string,
  days: number = 30
): Promise<RepositorySnapshot[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return getSnapshotsByDateRange(repositoryId, {
    start: startDate,
    end: new Date(),
  });
}

/**
 * Get time series data for specific metrics
 */
export async function getTimeSeries(
  repositoryId: string,
  metrics: string[],
  dateRange: DateRange,
  granularity: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<MetricTimeSeries[]> {
  const snapshots = await getSnapshotsByDateRange(repositoryId, dateRange);
  
  // Map metric names to snapshot properties
  const metricMapping: Record<string, keyof RepositorySnapshot> = {
    stars: 'starsCount',
    forks: 'forksCount',
    watchers: 'watchersCount',
    issues: 'openIssuesCount',
    commits: 'commitsLast30d',
    prs: 'prsOpenedLast30d',
    contributors: 'contributorsCount',
  };

  // Aggregate by granularity if needed
  const aggregatedSnapshots = aggregateSnapshots(snapshots, granularity);

  // Build time series for each metric
  return metrics.map(metric => {
    const property = metricMapping[metric] ?? 'starsCount';
    
    return {
      metric,
      data: aggregatedSnapshots.map(snapshot => ({
        date: snapshot.snapshotDate,
        value: (snapshot[property] as number) ?? 0,
      })),
    };
  });
}

/**
 * Aggregate snapshots by granularity
 */
function aggregateSnapshots(
  snapshots: RepositorySnapshot[],
  granularity: 'daily' | 'weekly' | 'monthly'
): RepositorySnapshot[] {
  if (granularity === 'daily' || snapshots.length === 0) {
    return snapshots;
  }

  // Group snapshots by period
  const groups = new Map<string, RepositorySnapshot[]>();
  
  snapshots.forEach(snapshot => {
    const key = getGroupKey(snapshot.snapshotDate, granularity);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(snapshot);
  });

  // Take the latest snapshot in each group
  return Array.from(groups.values())
    .map(group => group[group.length - 1]!)
    .sort((a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime());
}

/**
 * Get grouping key based on granularity
 */
function getGroupKey(date: Date, granularity: 'weekly' | 'monthly'): string {
  const year = date.getFullYear();
  
  if (granularity === 'weekly') {
    // Get week number
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const week = Math.ceil(days / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }
  
  // Monthly
  return `${year}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

/**
 * Check if snapshot exists for a date
 */
export async function snapshotExistsForDate(
  repositoryId: string,
  date: Date
): Promise<boolean> {
  const client = getAdminClient();
  
  const dateStr = date.toISOString().split('T')[0];
  
  const { count, error } = await client
    .from('repository_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('repository_id', repositoryId)
    .eq('snapshot_date', dateStr);

  if (error) return false;
  return (count ?? 0) > 0;
}

// ============================================================================
// SNAPSHOT MUTATIONS
// ============================================================================

/**
 * Create a new snapshot
 */
export async function createSnapshot(
  data: Omit<RepositorySnapshot, 'id' | 'createdAt'>
): Promise<RepositorySnapshot | null> {
  const client = getAdminClient();
  
  const dbData = {
    repository_id: data.repositoryId,
    snapshot_date: data.snapshotDate.toISOString().split('T')[0],
    stars_count: data.starsCount,
    forks_count: data.forksCount,
    watchers_count: data.watchersCount,
    open_issues_count: data.openIssuesCount,
    commits_count: data.commitsCount,
    contributors_count: data.contributorsCount,
    releases_count: data.releasesCount,
    commits_last_30d: data.commitsLast30d,
    prs_opened_last_30d: data.prsOpenedLast30d,
    prs_merged_last_30d: data.prsMergedLast30d,
    issues_opened_last_30d: data.issuesOpenedLast30d,
    issues_closed_last_30d: data.issuesClosedLast30d,
  };

  const { data: result, error } = await client
    .from('repository_snapshots')
    .upsert(dbData as never, { 
      onConflict: 'repository_id,snapshot_date',
    })
    .select()
    .single();

  if (error || !result) {
    console.error('Create snapshot error:', error);
    return null;
  }

  return mapToSnapshot(result as unknown as DbRepositorySnapshot);
}

/**
 * Delete old snapshots (cleanup)
 */
export async function deleteOldSnapshots(
  olderThanDays: number = 365
): Promise<number> {
  const client = getAdminClient();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  const { count, error } = await client
    .from('repository_snapshots')
    .delete({ count: 'exact' })
    .lt('snapshot_date', cutoffDate.toISOString().split('T')[0]);

  if (error) {
    console.error('Delete old snapshots error:', error);
    return 0;
  }

  return count ?? 0;
}
