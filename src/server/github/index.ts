/**
 * ============================================================================
 * DISCOVER: GitHub API Client
 * Description: Wrapper for GitHub REST and GraphQL APIs
 * ============================================================================
 */

import 'server-only';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * GitHub repository response from API
 */
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  homepage: string | null;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  fork: boolean;
  archived: boolean;
  is_template: boolean;
  has_wiki: boolean;
  has_issues: boolean;
  has_discussions: boolean;
  license: {
    key: string;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

/**
 * GitHub release response
 */
export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  body: string;
}

/**
 * GitHub contributor stats
 */
export interface GitHubContributorStats {
  total_contributors: number;
  total_commits: number;
}

/**
 * GitHub API rate limit info
 */
export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

// ============================================================================
// GITHUB CLIENT
// ============================================================================

/**
 * GitHub API client with retry and error handling
 */
class GitHubClient {
  private baseUrl = 'https://api.github.com';
  private token: string | undefined;
  
  constructor() {
    this.token = env.GITHUB_TOKEN;
    
    if (!this.token) {
      logger.warn('GitHub token not configured - API rate limits will be very low');
    }
  }
  
  /**
   * Make a request to the GitHub API
   */
  private async request<T>(
    path: string,
    options?: {
      method?: string;
      body?: unknown;
      retries?: number;
    }
  ): Promise<T> {
    const { method = 'GET', body, retries = 3 } = options ?? {};
    
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Discover-App',
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    const url = `${this.baseUrl}${path}`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        
        // Check rate limit headers
        const remaining = parseInt(response.headers.get('x-ratelimit-remaining') ?? '0');
        if (remaining < 100) {
          logger.warn('GitHub rate limit low', { remaining });
        }
        
        // Handle rate limiting
        if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
          const resetTime = parseInt(response.headers.get('x-ratelimit-reset') ?? '0') * 1000;
          const waitTime = Math.max(0, resetTime - Date.now());
          
          logger.warn('GitHub rate limited', { waitTime });
          
          if (attempt < retries && waitTime < 60000) {
            await this.sleep(waitTime + 1000);
            continue;
          }
          
          throw new Error('GitHub API rate limited');
        }
        
        // Handle abuse detection
        if (response.status === 403 && response.headers.get('retry-after')) {
          const retryAfter = parseInt(response.headers.get('retry-after') ?? '60');
          
          if (attempt < retries) {
            logger.warn('GitHub abuse detection triggered', { retryAfter });
            await this.sleep(retryAfter * 1000);
            continue;
          }
          
          throw new Error('GitHub API abuse detection triggered');
        }
        
        // Handle not found
        if (response.status === 404) {
          throw new GitHubNotFoundError(`Resource not found: ${path}`);
        }
        
        // Handle other errors
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`GitHub API error: ${response.status} - ${errorBody}`);
        }
        
        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof GitHubNotFoundError) {
          throw error;
        }
        
        if (attempt < retries) {
          const backoff = Math.pow(2, attempt) * 1000;
          logger.warn('GitHub request failed, retrying', { attempt, backoff, error });
          await this.sleep(backoff);
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('GitHub request failed after retries');
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================
  
  /**
   * Get a repository by owner and name
   */
  async getRepository(owner: string, name: string): Promise<GitHubRepository> {
    return this.request<GitHubRepository>(`/repos/${owner}/${name}`);
  }
  
  /**
   * Search repositories
   */
  async searchRepositories(
    query: string,
    options?: {
      sort?: 'stars' | 'forks' | 'updated';
      order?: 'asc' | 'desc';
      perPage?: number;
      page?: number;
    }
  ): Promise<{
    total_count: number;
    items: GitHubRepository[];
  }> {
    const params = new URLSearchParams({
      q: query,
      sort: options?.sort ?? 'stars',
      order: options?.order ?? 'desc',
      per_page: (options?.perPage ?? 30).toString(),
      page: (options?.page ?? 1).toString(),
    });
    
    return this.request(`/search/repositories?${params}`);
  }
  
  /**
   * Get repository releases
   */
  async getReleases(
    owner: string,
    name: string,
    perPage: number = 30
  ): Promise<GitHubRelease[]> {
    return this.request<GitHubRelease[]>(
      `/repos/${owner}/${name}/releases?per_page=${perPage}`
    );
  }
  
  /**
   * Get repository contributor count
   * Note: This is expensive - use sparingly
   */
  async getContributorCount(owner: string, name: string): Promise<number> {
    try {
      // Get first page with per_page=1 and check the Link header
      const response = await fetch(
        `${this.baseUrl}/repos/${owner}/${name}/contributors?per_page=1&anon=true`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Discover-App',
            ...(this.token && { Authorization: `Bearer ${this.token}` }),
          },
        }
      );
      
      if (!response.ok) return 0;
      
      // Parse Link header for last page number
      const linkHeader = response.headers.get('link');
      if (!linkHeader) {
        const data = await response.json();
        return Array.isArray(data) ? data.length : 0;
      }
      
      const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
      return lastMatch ? parseInt(lastMatch[1]!) : 1;
    } catch {
      return 0;
    }
  }
  
  /**
   * Get repository commit activity (commits per week for the last year)
   */
  async getCommitActivity(
    owner: string,
    name: string
  ): Promise<{ week: number; total: number }[]> {
    try {
      return await this.request<{ week: number; total: number }[]>(
        `/repos/${owner}/${name}/stats/commit_activity`
      );
    } catch {
      return [];
    }
  }
  
  /**
   * Get repository issues/PRs count for the last 30 days
   */
  async getRecentActivity(
    owner: string,
    name: string
  ): Promise<{
    issuesOpened: number;
    issuesClosed: number;
    prsOpened: number;
    prsMerged: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().split('T')[0];
    
    try {
      // Search for issues
      const issuesOpened = await this.searchIssues(
        `repo:${owner}/${name} is:issue created:>=${sinceStr}`
      );
      
      const issuesClosed = await this.searchIssues(
        `repo:${owner}/${name} is:issue closed:>=${sinceStr}`
      );
      
      const prsOpened = await this.searchIssues(
        `repo:${owner}/${name} is:pr created:>=${sinceStr}`
      );
      
      const prsMerged = await this.searchIssues(
        `repo:${owner}/${name} is:pr merged:>=${sinceStr}`
      );
      
      return {
        issuesOpened: issuesOpened.total_count,
        issuesClosed: issuesClosed.total_count,
        prsOpened: prsOpened.total_count,
        prsMerged: prsMerged.total_count,
      };
    } catch {
      return { issuesOpened: 0, issuesClosed: 0, prsOpened: 0, prsMerged: 0 };
    }
  }
  
  /**
   * Search issues/PRs
   */
  private async searchIssues(query: string): Promise<{ total_count: number }> {
    return this.request<{ total_count: number }>(
      `/search/issues?q=${encodeURIComponent(query)}&per_page=1`
    );
  }
  
  /**
   * Get rate limit status
   */
  async getRateLimit(): Promise<GitHubRateLimit> {
    const response = await this.request<{
      rate: GitHubRateLimit;
    }>('/rate_limit');
    return response.rate;
  }
}

// ============================================================================
// CUSTOM ERRORS
// ============================================================================

export class GitHubNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubNotFoundError';
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let githubClientInstance: GitHubClient | null = null;

/**
 * Get the GitHub client instance
 */
export function getGitHubClient(): GitHubClient {
  if (!githubClientInstance) {
    githubClientInstance = new GitHubClient();
  }
  return githubClientInstance;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert GitHub API response to our repository format
 */
export function mapGitHubRepository(gh: GitHubRepository) {
  return {
    githubId: gh.id,
    owner: gh.owner.login,
    name: gh.name,
    description: gh.description,
    homepageUrl: gh.homepage,
    language: gh.language,
    topics: gh.topics,
    starsCount: gh.stargazers_count,
    forksCount: gh.forks_count,
    watchersCount: gh.watchers_count,
    openIssuesCount: gh.open_issues_count,
    isFork: gh.fork,
    isArchived: gh.archived,
    isTemplate: gh.is_template,
    hasWiki: gh.has_wiki,
    hasIssues: gh.has_issues,
    hasDiscussions: gh.has_discussions,
    licenseKey: gh.license?.key ?? null,
    licenseName: gh.license?.name ?? null,
    githubCreatedAt: new Date(gh.created_at),
    githubUpdatedAt: new Date(gh.updated_at),
    githubPushedAt: new Date(gh.pushed_at),
    lastSyncedAt: new Date(),
  };
}
