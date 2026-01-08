/**
 * ============================================================================
 * DISCOVER: Alternatives Use Case
 * Description: Find similar/alternative repositories
 * ============================================================================
 */

import 'server-only';
import type { RepositorySummary, Repository } from '@/core/types';
import { rankAlternatives, type RankedAlternative } from '@/core/alternatives';
import * as reposRepo from '@/dal/repos.repo';
import * as scoresRepo from '@/dal/scores.repo';
import { cached, buildCacheKey } from '@/server/cache';

// ============================================================================
// TYPES
// ============================================================================

export interface AlternativesParams {
  repositoryId: string;
  limit?: number;
}

export interface AlternativesResult {
  seedRepository: RepositorySummary;
  alternatives: RankedAlternative[];
}

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Find alternative repositories to a given repository
 */
export async function getAlternatives(params: AlternativesParams): Promise<AlternativesResult | null> {
  const { repositoryId, limit = 10 } = params;

  // Get the seed repository
  const seedRepo = await reposRepo.getRepositoryById(repositoryId);
  if (!seedRepo) {
    return null;
  }

  // Build cache key
  const cacheKey = buildCacheKey('alternatives', repositoryId, limit.toString());

  // Get alternatives with caching
  const alternatives = await cached(
    cacheKey,
    () => findAlternatives(seedRepo, limit),
    600 // Cache for 10 minutes
  );

  return {
    seedRepository: toSummary(seedRepo),
    alternatives,
  };
}

/**
 * Find alternative repositories
 */
async function findAlternatives(
  seedRepo: Repository,
  limit: number
): Promise<RankedAlternative[]> {
  // Get seed repository score
  const seedScore = await scoresRepo.getLatestScore(seedRepo.id);

  // Find candidates by language and topics
  const [languageCandidates, topicCandidates] = await Promise.all([
    seedRepo.language
      ? reposRepo.getRepositoriesByLanguage(seedRepo.language, seedRepo.id, 50)
      : Promise.resolve([]),
    seedRepo.topics.length > 0
      ? reposRepo.getRepositoriesByTopics(seedRepo.topics, seedRepo.id, 50)
      : Promise.resolve([]),
  ]);

  // Combine and deduplicate candidates
  const candidateMap = new Map<string, Repository>();
  
  for (const repo of [...languageCandidates, ...topicCandidates]) {
    if (!candidateMap.has(repo.id)) {
      candidateMap.set(repo.id, repo);
    }
  }

  const candidates = Array.from(candidateMap.values());

  if (candidates.length === 0) {
    return [];
  }

  // Get scores for candidates
  const candidateIds = candidates.map(c => c.id);
  const scoresMap = await scoresRepo.getLatestScoresForRepos(candidateIds);

  // Build input for ranking algorithm
  const candidatesWithScores = candidates.map(repo => ({
    repository: repo,
    score: scoresMap.get(repo.id) ?? null,
  }));

  // Rank alternatives
  return rankAlternatives({
    seedRepository: seedRepo,
    seedScore,
    candidates: candidatesWithScores,
    maxResults: limit,
  });
}

/**
 * Convert repository to summary
 */
function toSummary(repo: Repository): RepositorySummary {
  return {
    id: repo.id,
    owner: repo.owner,
    name: repo.name,
    fullName: repo.fullName,
    description: repo.description,
    language: repo.language,
    starsCount: repo.starsCount,
    forksCount: repo.forksCount,
    topics: repo.topics,
  };
}
