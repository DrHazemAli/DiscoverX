/**
 * ============================================================================
 * DISCOVER: Rankings Use Case
 * Description: Get precomputed repository rankings
 * ============================================================================
 */

import 'server-only';
import type { RankingWithRepository, RankingPeriod, RankingType, PaginatedResponse } from '@/core/types';
import * as rankingsRepo from '@/dal/rankings.repo';
import { cached, buildCacheKey } from '@/server/cache';

// ============================================================================
// TYPES
// ============================================================================

export interface RankingsParams {
  period: RankingPeriod;
  type: RankingType;
  language?: string | null;
  asOf?: Date;
  page?: number;
  limit?: number;
}

export interface RankingsResult extends PaginatedResponse<RankingWithRepository> {
  metadata: {
    period: RankingPeriod;
    type: RankingType;
    language: string | null;
    asOf: string;
  };
}

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Get rankings with pagination
 */
export async function getRankings(params: RankingsParams): Promise<RankingsResult> {
  const {
    period,
    type,
    language,
    page = 1,
    limit = 20,
  } = params;

  // Get the most recent ranking date if not specified
  let asOf = params.asOf;
  if (!asOf) {
    asOf = await rankingsRepo.getLatestRankingDate(period) ?? new Date();
  }

  // Build cache key
  const cacheKey = buildCacheKey(
    'rankings',
    period,
    type,
    language ?? 'all',
    asOf.toISOString().split('T')[0]!,
    page.toString(),
    limit.toString()
  );

  // Get rankings with caching
  const rankings = await cached(
    cacheKey,
    () => rankingsRepo.getRankings(period, type, asOf!, language ?? null, page, limit),
    300 // Cache for 5 minutes
  );

  return {
    ...rankings,
    metadata: {
      period,
      type,
      language: language ?? null,
      asOf: asOf.toISOString().split('T')[0]!,
    },
  };
}

/**
 * Get available languages in rankings
 */
export async function getRankedLanguages(period: RankingPeriod): Promise<string[]> {
  const cacheKey = buildCacheKey('ranked-languages', period);

  return cached(
    cacheKey,
    () => rankingsRepo.getRankedLanguages(period),
    3600 // Cache for 1 hour
  );
}

/**
 * Get ranking for a specific repository
 */
export async function getRepositoryRanking(
  repositoryId: string,
  period: RankingPeriod,
  type: RankingType = 'overall'
) {
  return rankingsRepo.getRepositoryRanking(repositoryId, period, type);
}
