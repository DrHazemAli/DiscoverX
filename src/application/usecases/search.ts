/**
 * ============================================================================
 * DISCOVER: Search Use Case
 * Description: Search and filter repositories
 * ============================================================================
 */

import 'server-only';
import type { RepositorySummary, PaginatedResponse, SearchFilters, SearchSort } from '@/core/types';
import * as reposRepo from '@/dal/repos.repo';
import { cached, buildCacheKey } from '@/server/cache';

// ============================================================================
// TYPES
// ============================================================================

export interface SearchParams {
  query?: string;
  language?: string;
  minStars?: number;
  maxStars?: number;
  topics?: string[];
  hasIssues?: boolean;
  hasDiscussions?: boolean;
  isArchived?: boolean;
  sort?: 'stars' | 'forks' | 'updated' | 'score' | 'name';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResult extends PaginatedResponse<RepositorySummary> {
  /** Query that was searched */
  query?: string;
}

// ============================================================================
// USE CASE
// ============================================================================

/**
 * Search repositories with filters
 */
export async function searchRepositories(params: SearchParams): Promise<SearchResult> {
  const {
    query,
    language,
    minStars,
    maxStars,
    topics,
    hasIssues,
    hasDiscussions,
    isArchived,
    sort = 'stars',
    order = 'desc',
    page = 1,
    limit = 20,
  } = params;

  // Build filters
  const filters: SearchFilters = {
    query,
    language,
    minStars,
    maxStars,
    topics,
    hasIssues,
    hasDiscussions,
    isArchived,
  };

  // Build sort
  const sortOptions: SearchSort = {
    field: sort,
    direction: order,
  };

  // Build cache key from params (for short-term caching)
  const cacheKey = buildCacheKey(
    'search',
    JSON.stringify({ filters, sortOptions, page, limit })
  );

  // Execute search with caching
  const result = await cached(
    cacheKey,
    () => reposRepo.searchRepositories(filters, sortOptions, page, limit),
    60 // Cache for 60 seconds
  );

  return result;
}

/**
 * Get available languages for filtering
 */
export async function getAvailableLanguages(): Promise<Array<{ language: string; count: number }>> {
  const cacheKey = buildCacheKey('languages');

  return cached(
    cacheKey,
    () => reposRepo.getLanguages(),
    3600 // Cache for 1 hour
  );
}
