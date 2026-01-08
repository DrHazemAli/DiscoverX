/**
 * ============================================================================
 * DISCOVER: Repository Profile Use Case
 * Description: Get detailed repository information with scores
 * ============================================================================
 */

import 'server-only';
import type { Repository, RepositoryScore, RepositorySnapshot, RepositoryRanking } from '@/core/types';
import * as reposRepo from '@/dal/repos.repo';
import * as scoresRepo from '@/dal/scores.repo';
import * as snapshotsRepo from '@/dal/snapshots.repo';
import * as rankingsRepo from '@/dal/rankings.repo';
import * as jobsRepo from '@/dal/jobs.repo';
import { getGitHubClient, mapGitHubRepository, GitHubNotFoundError } from '@/server/github';
import { cached, buildCacheKey } from '@/server/cache';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface RepositoryProfile {
  repository: Repository;
  score: RepositoryScore | null;
  latestSnapshot: RepositorySnapshot | null;
  ranking: RepositoryRanking | null;
}

// ============================================================================
// USE CASES
// ============================================================================

/**
 * Get a repository by owner and name
 * If not found locally, will attempt to fetch from GitHub
 */
export async function getRepositoryProfile(
  owner: string,
  name: string
): Promise<RepositoryProfile | null> {
  // Try to get from database first
  let repository = await reposRepo.getRepositoryByFullName(owner, name);

  // If not found locally, try to fetch from GitHub
  if (!repository) {
    repository = await fetchAndStoreRepository(owner, name);
    if (!repository) {
      return null;
    }
  }

  // Check if data is stale (older than 1 hour)
  const isStale = repository.lastSyncedAt
    ? Date.now() - repository.lastSyncedAt.getTime() > 3600000
    : true;

  // If stale, schedule a refresh job
  if (isStale) {
    await jobsRepo.enqueueJob('repo.refresh', { repositoryId: repository.id }, { priority: 2 });
  }

  // Get related data in parallel
  const [score, latestSnapshot, ranking] = await Promise.all([
    scoresRepo.getLatestScore(repository.id),
    snapshotsRepo.getLatestSnapshot(repository.id),
    rankingsRepo.getRepositoryRanking(repository.id, 'weekly'),
  ]);

  return {
    repository,
    score,
    latestSnapshot,
    ranking,
  };
}

/**
 * Fetch a repository from GitHub and store it
 */
async function fetchAndStoreRepository(
  owner: string,
  name: string
): Promise<Repository | null> {
  const github = getGitHubClient();

  try {
    logger.info('Fetching repository from GitHub', { owner, name });
    const ghRepo = await github.getRepository(owner, name);
    const mapped = mapGitHubRepository(ghRepo);

    const repository = await reposRepo.upsertRepository(mapped);

    if (repository) {
      // Schedule jobs to populate data
      await Promise.all([
        jobsRepo.enqueueJob('repo.daily_snapshot', { repositoryId: repository.id }),
        jobsRepo.enqueueJob('repo.signals', { repositoryId: repository.id }),
        jobsRepo.enqueueJob('repo.score', { repositoryId: repository.id }),
      ]);
    }

    return repository;
  } catch (error) {
    if (error instanceof GitHubNotFoundError) {
      logger.info('Repository not found on GitHub', { owner, name });
      return null;
    }
    logger.error('Failed to fetch repository from GitHub', { owner, name, error });
    return null;
  }
}

/**
 * Get repository by ID
 */
export async function getRepositoryById(id: string): Promise<Repository | null> {
  return reposRepo.getRepositoryById(id);
}

/**
 * Get multiple repositories by IDs
 */
export async function getRepositoriesByIds(ids: string[]): Promise<Repository[]> {
  const cacheKey = buildCacheKey('repos', ids.sort().join(','));

  return cached(
    cacheKey,
    () => reposRepo.getRepositoriesByIds(ids),
    300 // Cache for 5 minutes
  );
}
