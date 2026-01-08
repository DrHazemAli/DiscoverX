/**
 * ============================================================================
 * DISCOVER: Rankings Repository
 * Description: Data access layer for repository ranking operations
 * ============================================================================
 */

import 'server-only';
import type { 
  RepositoryRanking, 
  RankingWithRepository,
  RankingPeriod, 
  RankingType,
  RankingExplanation,
  PaginatedResponse,
} from '@/core/types';
import { getAdminClient, type DbRepositoryRanking, type DbRepository } from './db';

// ============================================================================
// MAPPER FUNCTIONS
// ============================================================================

/**
 * Map database row to domain RepositoryRanking
 */
function mapToRanking(row: DbRepositoryRanking): RepositoryRanking {
  return {
    id: row.id,
    period: row.period as RankingPeriod,
    asOf: new Date(row.as_of),
    rankingType: row.ranking_type as RankingType,
    language: row.language,
    repositoryId: row.repository_id,
    rank: row.rank,
    score: Number(row.score),
    rankChange: row.rank_change,
    rankingExplanation: row.ranking_explanation as unknown as RankingExplanation,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Map repository row to summary for ranking
 */
function mapRepoToSummary(row: DbRepository) {
  return {
    id: row.id,
    owner: row.owner,
    name: row.name,
    fullName: row.full_name,
    description: row.description,
    language: row.language,
    starsCount: row.stars_count,
    forksCount: row.forks_count,
    topics: row.topics,
  };
}

// ============================================================================
// RANKING QUERIES
// ============================================================================

/**
 * Get rankings with pagination
 */
export async function getRankings(
  period: RankingPeriod,
  rankingType: RankingType,
  asOf: Date,
  language: string | null,
  page: number,
  limit: number
): Promise<PaginatedResponse<RankingWithRepository>> {
  const client = getAdminClient();
  
  const dateStr = asOf.toISOString().split('T')[0];
  
  // Build query
  let query = client
    .from('repository_rankings')
    .select('*, repositories!inner(*)', { count: 'exact' })
    .eq('period', period)
    .eq('ranking_type', rankingType)
    .eq('as_of', dateStr);

  // Language filter
  if (language) {
    query = query.eq('language', language);
  } else {
    query = query.is('language', null);
  }

  // Ordering and pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  query = query
    .order('rank', { ascending: true })
    .range(from, to);

  const { data, error, count } = await query;

  if (error || !data) {
    console.error('Get rankings error:', error);
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Map results
  const rankings = data.map((row: DbRepositoryRanking & { repositories: DbRepository }) => ({
    ...mapToRanking(row),
    repository: mapRepoToSummary(row.repositories),
  }));

  return {
    data: rankings,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Get the most recent ranking date for a period
 */
export async function getLatestRankingDate(
  period: RankingPeriod
): Promise<Date | null> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('repository_rankings')
    .select('as_of')
    .eq('period', period)
    .order('as_of', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return new Date((data as { as_of: string }).as_of);
}

/**
 * Get previous rankings for calculating rank changes
 */
export async function getPreviousRankings(
  period: RankingPeriod,
  rankingType: RankingType,
  asOf: Date,
  language: string | null
): Promise<Map<string, number>> {
  const client = getAdminClient();
  
  // Calculate previous period date
  const previousDate = new Date(asOf);
  switch (period) {
    case 'daily':
      previousDate.setDate(previousDate.getDate() - 1);
      break;
    case 'weekly':
      previousDate.setDate(previousDate.getDate() - 7);
      break;
    case 'monthly':
      previousDate.setMonth(previousDate.getMonth() - 1);
      break;
  }
  
  const dateStr = previousDate.toISOString().split('T')[0];
  
  let query = client
    .from('repository_rankings')
    .select('repository_id, rank')
    .eq('period', period)
    .eq('ranking_type', rankingType)
    .eq('as_of', dateStr);

  if (language) {
    query = query.eq('language', language);
  } else {
    query = query.is('language', null);
  }

  const { data, error } = await query;

  if (error || !data) return new Map();

  const rankMap = new Map<string, number>();
  for (const row of data) {
    const r = row as { repository_id: string; rank: number };
    rankMap.set(r.repository_id, r.rank);
  }

  return rankMap;
}

/**
 * Get ranking for a specific repository
 */
export async function getRepositoryRanking(
  repositoryId: string,
  period: RankingPeriod,
  rankingType: RankingType = 'overall'
): Promise<RepositoryRanking | null> {
  const client = getAdminClient();
  
  // Get the latest ranking
  const latestDate = await getLatestRankingDate(period);
  if (!latestDate) return null;
  
  const dateStr = latestDate.toISOString().split('T')[0];
  
  const { data, error } = await client
    .from('repository_rankings')
    .select('*')
    .eq('repository_id', repositoryId)
    .eq('period', period)
    .eq('ranking_type', rankingType)
    .eq('as_of', dateStr)
    .is('language', null)
    .single();

  if (error || !data) return null;
  return mapToRanking(data as DbRepositoryRanking);
}

/**
 * Get available languages in rankings
 */
export async function getRankedLanguages(
  period: RankingPeriod
): Promise<string[]> {
  const client = getAdminClient();
  
  const latestDate = await getLatestRankingDate(period);
  if (!latestDate) return [];
  
  const dateStr = latestDate.toISOString().split('T')[0];
  
  const { data, error } = await client
    .from('repository_rankings')
    .select('language')
    .eq('period', period)
    .eq('as_of', dateStr)
    .not('language', 'is', null);

  if (error || !data) return [];

  // Get unique languages
  const languages = new Set<string>();
  for (const row of data) {
    const r = row as { language: string | null };
    if (r.language) {
      languages.add(r.language);
    }
  }

  return Array.from(languages).sort();
}

// ============================================================================
// RANKING MUTATIONS
// ============================================================================

/**
 * Save rankings (bulk insert)
 */
export async function saveRankings(
  rankings: Array<{
    period: RankingPeriod;
    asOf: Date;
    rankingType: RankingType;
    language: string | null;
    repositoryId: string;
    rank: number;
    score: number;
    rankChange: number;
    rankingExplanation: RankingExplanation;
  }>
): Promise<number> {
  if (rankings.length === 0) return 0;
  
  const client = getAdminClient();
  
  const dbData = rankings.map(r => ({
    period: r.period,
    as_of: r.asOf.toISOString().split('T')[0],
    ranking_type: r.rankingType,
    language: r.language,
    repository_id: r.repositoryId,
    rank: r.rank,
    score: r.score,
    rank_change: r.rankChange,
    ranking_explanation: r.rankingExplanation,
  }));

  // Insert in batches to avoid payload limits
  const batchSize = 100;
  let insertedCount = 0;

  for (let i = 0; i < dbData.length; i += batchSize) {
    const batch = dbData.slice(i, i + batchSize);
    
    const { error, count } = await client
      .from('repository_rankings')
      .upsert(batch, { 
        onConflict: 'period,as_of,ranking_type,language,repository_id',
        count: 'exact',
      });

    if (error) {
      console.error('Save rankings error:', error);
    } else {
      insertedCount += count ?? batch.length;
    }
  }

  return insertedCount;
}

/**
 * Delete old rankings (cleanup)
 */
export async function deleteOldRankings(
  period: RankingPeriod,
  keepDays: number = 90
): Promise<number> {
  const client = getAdminClient();
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - keepDays);
  
  const { count, error } = await client
    .from('repository_rankings')
    .delete({ count: 'exact' })
    .eq('period', period)
    .lt('as_of', cutoffDate.toISOString().split('T')[0]);

  if (error) {
    console.error('Delete old rankings error:', error);
    return 0;
  }

  return count ?? 0;
}
