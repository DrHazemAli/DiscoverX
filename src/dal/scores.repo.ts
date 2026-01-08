/**
 * ============================================================================
 * DISCOVER: Scores Repository
 * Description: Data access layer for repository score operations
 * ============================================================================
 */

import 'server-only';
import type { RepositoryScore, ScoreBreakdown } from '@/core/types';
import { getAdminClient, type DbRepositoryScore } from './db';

// ============================================================================
// MAPPER FUNCTIONS
// ============================================================================

/**
 * Map database row to domain RepositoryScore
 */
function mapToScore(row: DbRepositoryScore): RepositoryScore {
  return {
    id: row.id,
    repositoryId: row.repository_id,
    computedAt: new Date(row.computed_at),
    overallScore: Number(row.overall_score),
    activityScore: Number(row.activity_score),
    communityScore: Number(row.community_score),
    maintenanceScore: Number(row.maintenance_score),
    popularityScore: Number(row.popularity_score),
    qualityScore: Number(row.quality_score),
    scoreBreakdown: row.score_breakdown as unknown as ScoreBreakdown,
    algorithmVersion: row.algorithm_version,
    createdAt: new Date(row.created_at),
  };
}

// ============================================================================
// SCORE QUERIES
// ============================================================================

/**
 * Get the latest score for a repository
 */
export async function getLatestScore(
  repositoryId: string
): Promise<RepositoryScore | null> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('repository_scores')
    .select('*')
    .eq('repository_id', repositoryId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return mapToScore(data as DbRepositoryScore);
}

/**
 * Get scores for multiple repositories
 */
export async function getLatestScoresForRepos(
  repositoryIds: string[]
): Promise<Map<string, RepositoryScore>> {
  if (repositoryIds.length === 0) return new Map();
  
  const client = getAdminClient();
  
  // Get latest score for each repository
  const { data, error } = await client
    .from('repository_scores')
    .select('*')
    .in('repository_id', repositoryIds)
    .order('computed_at', { ascending: false });

  if (error || !data) return new Map();

  // Keep only the latest score per repository
  const scoreMap = new Map<string, RepositoryScore>();
  for (const row of data as DbRepositoryScore[]) {
    if (!scoreMap.has(row.repository_id)) {
      scoreMap.set(row.repository_id, mapToScore(row));
    }
  }

  return scoreMap;
}

/**
 * Get all latest scores (for rankings computation)
 */
export async function getAllLatestScores(): Promise<RepositoryScore[]> {
  const client = getAdminClient();
  
  // This is a workaround since Supabase doesn't support DISTINCT ON
  // We get all scores and filter client-side
  const { data, error } = await client
    .from('repository_scores')
    .select('*')
    .order('computed_at', { ascending: false });

  if (error || !data) return [];

  // Keep only the latest score per repository
  const seen = new Set<string>();
  const scores: RepositoryScore[] = [];
  
  for (const row of data as DbRepositoryScore[]) {
    if (!seen.has(row.repository_id)) {
      seen.add(row.repository_id);
      scores.push(mapToScore(row));
    }
  }

  return scores;
}

/**
 * Get score history for a repository
 */
export async function getScoreHistory(
  repositoryId: string,
  limit: number = 30
): Promise<RepositoryScore[]> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('repository_scores')
    .select('*')
    .eq('repository_id', repositoryId)
    .order('computed_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as DbRepositoryScore[]).map(mapToScore);
}

/**
 * Get top repositories by overall score
 */
export async function getTopByScore(
  limit: number = 100,
  language?: string
): Promise<Array<{ repositoryId: string; score: number }>> {
  const client = getAdminClient();
  
  // First get all latest scores
  const scores = await getAllLatestScores();
  
  // If language filter, we need to join with repositories
  if (language) {
    const { data: repos } = await client
      .from('repositories')
      .select('id')
      .eq('language', language);
    
    if (!repos) return [];
    
    const repoIds = new Set(repos.map(r => (r as { id: string }).id));
    return scores
      .filter(s => repoIds.has(s.repositoryId))
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit)
      .map(s => ({ repositoryId: s.repositoryId, score: s.overallScore }));
  }

  return scores
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, limit)
    .map(s => ({ repositoryId: s.repositoryId, score: s.overallScore }));
}

// ============================================================================
// SCORE MUTATIONS
// ============================================================================

/**
 * Save a new score
 */
export async function saveScore(
  repositoryId: string,
  score: {
    overallScore: number;
    activityScore: number;
    communityScore: number;
    maintenanceScore: number;
    popularityScore: number;
    qualityScore: number;
    scoreBreakdown: ScoreBreakdown;
    algorithmVersion: string;
  }
): Promise<RepositoryScore | null> {
  const client = getAdminClient();
  
  const dbData = {
    repository_id: repositoryId,
    computed_at: new Date().toISOString(),
    overall_score: score.overallScore,
    activity_score: score.activityScore,
    community_score: score.communityScore,
    maintenance_score: score.maintenanceScore,
    popularity_score: score.popularityScore,
    quality_score: score.qualityScore,
    score_breakdown: score.scoreBreakdown,
    algorithm_version: score.algorithmVersion,
  };

  const { data: result, error } = await client
    .from('repository_scores')
    .insert(dbData as never)
    .select()
    .single();

  if (error || !result) {
    console.error('Save score error:', error);
    return null;
  }

  return mapToScore(result as unknown as DbRepositoryScore);
}

/**
 * Delete old scores (keep only recent ones)
 */
export async function deleteOldScores(
  repositoryId: string,
  keepCount: number = 30
): Promise<number> {
  const client = getAdminClient();
  
  // Get scores to delete (all except the most recent keepCount)
  const { data: scores } = await client
    .from('repository_scores')
    .select('id')
    .eq('repository_id', repositoryId)
    .order('computed_at', { ascending: false });

  if (!scores || scores.length <= keepCount) return 0;

  const idsToDelete = scores.slice(keepCount).map(s => (s as { id: string }).id);
  
  const { count, error } = await client
    .from('repository_scores')
    .delete({ count: 'exact' })
    .in('id', idsToDelete);

  if (error) {
    console.error('Delete old scores error:', error);
    return 0;
  }

  return count ?? 0;
}
