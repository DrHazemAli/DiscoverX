/**
 * ============================================================================
 * DISCOVER: Timeseries Use Case
 * Description: Get historical metrics for repositories
 * ============================================================================
 */

import 'server-only';
import type { DateRange } from '@/core/types';
import * as snapshotsRepo from '@/dal/snapshots.repo';
import { cached, buildCacheKey } from '@/server/cache';

// ============================================================================
// TYPES
// ============================================================================

export interface TimeseriesParams {
  repositoryId: string;
  metrics: string[];
  from?: Date;
  to?: Date;
  granularity?: 'daily' | 'weekly' | 'monthly';
}

export interface TimeseriesResult {
  repositoryId: string;
  metrics: Record<string, Array<{ date: string; value: number }>>;
  from: string;
  to: string;
  granularity: string;
}

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Get time series data for a repository
 */
export async function getTimeseries(params: TimeseriesParams): Promise<TimeseriesResult> {
  const {
    repositoryId,
    metrics,
    from = getDefaultFromDate(),
    to = new Date(),
    granularity = 'daily',
  } = params;

  const dateRange: DateRange = { start: from, end: to };

  // Build cache key
  const cacheKey = buildCacheKey(
    'timeseries',
    repositoryId,
    metrics.join(','),
    from.toISOString().split('T')[0]!,
    to.toISOString().split('T')[0]!,
    granularity
  );

  // Get time series with caching
  const timeSeries = await cached(
    cacheKey,
    () => snapshotsRepo.getTimeSeries(repositoryId, metrics, dateRange, granularity),
    300 // Cache for 5 minutes
  );

  // Convert to response format
  const metricsData: Record<string, Array<{ date: string; value: number }>> = {};

  for (const series of timeSeries) {
    metricsData[series.metric] = series.data.map(point => ({
      date: point.date.toISOString().split('T')[0]!,
      value: point.value,
    }));
  }

  return {
    repositoryId,
    metrics: metricsData,
    from: from.toISOString().split('T')[0]!,
    to: to.toISOString().split('T')[0]!,
    granularity,
  };
}

/**
 * Get default "from" date (90 days ago)
 */
function getDefaultFromDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 90);
  return date;
}

/**
 * Get available metrics
 */
export function getAvailableMetrics(): string[] {
  return [
    'stars',
    'forks',
    'watchers',
    'issues',
    'commits',
    'prs',
    'contributors',
  ];
}
