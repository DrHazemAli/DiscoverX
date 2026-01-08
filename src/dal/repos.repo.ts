/**
 * ============================================================================
 * DISCOVER: Repositories Repository
 * Description: Data access layer for repository operations
 * ============================================================================
 */

import 'server-only';
import type { Repository, RepositorySummary, SearchFilters, SearchSort, PaginatedResponse } from '@/core/types';
import { getAdminClient, type DbRepository } from './db';

// ============================================================================
// MAPPER FUNCTIONS
// ============================================================================

/**
 * Map database row to domain Repository
 */
function mapToRepository(row: DbRepository): Repository {
  return {
    id: row.id,
    githubId: row.github_id,
    owner: row.owner,
    name: row.name,
    fullName: row.full_name,
    description: row.description,
    homepageUrl: row.homepage_url,
    language: row.language,
    topics: row.topics,
    starsCount: row.stars_count,
    forksCount: row.forks_count,
    watchersCount: row.watchers_count,
    openIssuesCount: row.open_issues_count,
    isFork: row.is_fork,
    isArchived: row.is_archived,
    isTemplate: row.is_template,
    hasWiki: row.has_wiki,
    hasIssues: row.has_issues,
    hasDiscussions: row.has_discussions,
    licenseKey: row.license_key,
    licenseName: row.license_name,
    githubCreatedAt: row.github_created_at ? new Date(row.github_created_at) : null,
    githubUpdatedAt: row.github_updated_at ? new Date(row.github_updated_at) : null,
    githubPushedAt: row.github_pushed_at ? new Date(row.github_pushed_at) : null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastSyncedAt: row.last_synced_at ? new Date(row.last_synced_at) : null,
  };
}

/**
 * Map database row to RepositorySummary
 */
function mapToSummary(row: DbRepository): RepositorySummary {
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
// REPOSITORY QUERIES
// ============================================================================

/**
 * Get a repository by ID
 */
export async function getRepositoryById(id: string): Promise<Repository | null> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('repositories')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapToRepository(data as DbRepository);
}

/**
 * Get a repository by owner and name
 */
export async function getRepositoryByFullName(
  owner: string,
  name: string
): Promise<Repository | null> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('repositories')
    .select('*')
    .eq('owner', owner)
    .eq('name', name)
    .single();

  if (error || !data) return null;
  return mapToRepository(data as DbRepository);
}

/**
 * Get a repository by GitHub ID
 */
export async function getRepositoryByGithubId(
  githubId: number
): Promise<Repository | null> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('repositories')
    .select('*')
    .eq('github_id', githubId)
    .single();

  if (error || !data) return null;
  return mapToRepository(data as DbRepository);
}

/**
 * Get multiple repositories by IDs
 */
export async function getRepositoriesByIds(ids: string[]): Promise<Repository[]> {
  if (ids.length === 0) return [];
  
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('repositories')
    .select('*')
    .in('id', ids);

  if (error || !data) return [];
  return (data as DbRepository[]).map(mapToRepository);
}

/**
 * Search repositories with filters
 */
export async function searchRepositories(
  filters: SearchFilters,
  sort: SearchSort,
  page: number,
  limit: number
): Promise<PaginatedResponse<RepositorySummary>> {
  const client = getAdminClient();
  
  // Build the query
  let query = client
    .from('repositories')
    .select('*', { count: 'exact' });

  // Apply filters
  if (filters.query) {
    // Search in name, description, and full_name
    query = query.or(
      `full_name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`
    );
  }

  if (filters.language) {
    query = query.eq('language', filters.language);
  }

  if (filters.minStars !== undefined) {
    query = query.gte('stars_count', filters.minStars);
  }

  if (filters.maxStars !== undefined) {
    query = query.lte('stars_count', filters.maxStars);
  }

  if (filters.topics && filters.topics.length > 0) {
    query = query.overlaps('topics', filters.topics);
  }

  if (filters.hasIssues !== undefined) {
    query = query.eq('has_issues', filters.hasIssues);
  }

  if (filters.hasDiscussions !== undefined) {
    query = query.eq('has_discussions', filters.hasDiscussions);
  }

  if (filters.isArchived !== undefined) {
    query = query.eq('is_archived', filters.isArchived);
  }

  // Apply sorting
  const sortColumn = {
    stars: 'stars_count',
    forks: 'forks_count',
    updated: 'updated_at',
    score: 'stars_count', // TODO: Join with scores table
    name: 'full_name',
  }[sort.field];

  query = query.order(sortColumn, { ascending: sort.direction === 'asc' });

  // Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Search repositories error:', error);
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

  return {
    data: (data as DbRepository[]).map(mapToSummary),
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
 * Get repositories by language (for alternatives)
 */
export async function getRepositoriesByLanguage(
  language: string,
  excludeId?: string,
  limit: number = 50
): Promise<Repository[]> {
  const client = getAdminClient();
  
  let query = client
    .from('repositories')
    .select('*')
    .eq('language', language)
    .order('stars_count', { ascending: false })
    .limit(limit);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return (data as DbRepository[]).map(mapToRepository);
}

/**
 * Get repositories by topics (for alternatives)
 */
export async function getRepositoriesByTopics(
  topics: string[],
  excludeId?: string,
  limit: number = 50
): Promise<Repository[]> {
  if (topics.length === 0) return [];
  
  const client = getAdminClient();
  
  let query = client
    .from('repositories')
    .select('*')
    .overlaps('topics', topics)
    .order('stars_count', { ascending: false })
    .limit(limit);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return (data as DbRepository[]).map(mapToRepository);
}

/**
 * Get available languages with counts
 */
export async function getLanguages(): Promise<Array<{ language: string; count: number }>> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('repositories')
    .select('language')
    .not('language', 'is', null);

  if (error || !data) return [];

  // Count languages manually (Supabase doesn't support group by in the JS client)
  const counts = new Map<string, number>();
  for (const row of data) {
    const lang = (row as { language: string }).language;
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);
}

// ============================================================================
// REPOSITORY MUTATIONS
// ============================================================================

/**
 * Create or update a repository
 */
export async function upsertRepository(
  data: Omit<Repository, 'id' | 'createdAt' | 'updatedAt' | 'fullName'>
): Promise<Repository | null> {
  const client = getAdminClient();
  
  const dbData = {
    github_id: data.githubId,
    owner: data.owner,
    name: data.name,
    description: data.description,
    homepage_url: data.homepageUrl,
    language: data.language,
    topics: data.topics,
    stars_count: data.starsCount,
    forks_count: data.forksCount,
    watchers_count: data.watchersCount,
    open_issues_count: data.openIssuesCount,
    is_fork: data.isFork,
    is_archived: data.isArchived,
    is_template: data.isTemplate,
    has_wiki: data.hasWiki,
    has_issues: data.hasIssues,
    has_discussions: data.hasDiscussions,
    license_key: data.licenseKey,
    license_name: data.licenseName,
    github_created_at: data.githubCreatedAt?.toISOString() ?? null,
    github_updated_at: data.githubUpdatedAt?.toISOString() ?? null,
    github_pushed_at: data.githubPushedAt?.toISOString() ?? null,
    last_synced_at: data.lastSyncedAt?.toISOString() ?? new Date().toISOString(),
  };

  const { data: result, error } = await client
    .from('repositories')
    .upsert(dbData as never, { onConflict: 'github_id' })
    .select()
    .single();

  if (error || !result) {
    console.error('Upsert repository error:', error);
    return null;
  }

  return mapToRepository(result as unknown as DbRepository);
}

/**
 * Update repository sync timestamp
 */
export async function updateRepositorySyncedAt(id: string): Promise<void> {
  const client = getAdminClient();
  
  await client
    .from('repositories')
    .update({ last_synced_at: new Date().toISOString() } as never)
    .eq('id', id);
}

/**
 * Delete a repository
 */
export async function deleteRepository(id: string): Promise<boolean> {
  const client = getAdminClient();
  
  const { error } = await client
    .from('repositories')
    .delete()
    .eq('id', id);

  return !error;
}
