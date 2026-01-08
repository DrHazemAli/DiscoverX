/**
 * ============================================================================
 * DISCOVER: API Contracts - Zod Schemas
 * Description: Request/response validation schemas for type-safe APIs
 * ============================================================================
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * Pagination parameters schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Sort direction schema
 */
export const sortDirectionSchema = z.enum(['asc', 'desc']);

/**
 * Date string schema (ISO format)
 */
export const dateStringSchema = z.string().datetime().or(z.string().date());

/**
 * UUID schema
 */
export const uuidSchema = z.string().uuid();

// ============================================================================
// REPOSITORY SCHEMAS
// ============================================================================

/**
 * Repository summary response schema
 */
export const repositorySummarySchema = z.object({
  id: z.string().uuid(),
  owner: z.string(),
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  starsCount: z.number().int(),
  forksCount: z.number().int(),
  topics: z.array(z.string()),
});

/**
 * Full repository response schema
 */
export const repositorySchema = repositorySummarySchema.extend({
  githubId: z.number().int(),
  homepageUrl: z.string().nullable(),
  watchersCount: z.number().int(),
  openIssuesCount: z.number().int(),
  isFork: z.boolean(),
  isArchived: z.boolean(),
  isTemplate: z.boolean(),
  hasWiki: z.boolean(),
  hasIssues: z.boolean(),
  hasDiscussions: z.boolean(),
  licenseKey: z.string().nullable(),
  licenseName: z.string().nullable(),
  githubCreatedAt: z.string().nullable(),
  githubUpdatedAt: z.string().nullable(),
  githubPushedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastSyncedAt: z.string().nullable(),
});

// ============================================================================
// SEARCH SCHEMAS
// ============================================================================

/**
 * Search request schema
 */
export const searchRequestSchema = z.object({
  query: z.string().min(1).max(200).optional(),
  language: z.string().max(100).optional(),
  minStars: z.coerce.number().int().min(0).optional(),
  maxStars: z.coerce.number().int().min(0).optional(),
  topics: z.string().transform(s => s.split(',')).optional(),
  hasIssues: z.coerce.boolean().optional(),
  hasDiscussions: z.coerce.boolean().optional(),
  isArchived: z.coerce.boolean().optional(),
  sort: z.enum(['stars', 'forks', 'updated', 'score', 'name']).default('stars'),
  order: sortDirectionSchema.default('desc'),
  ...paginationSchema.shape,
});

/**
 * Search response schema
 */
export const searchResponseSchema = z.object({
  data: z.array(repositorySummarySchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasMore: z.boolean(),
  }),
});

// ============================================================================
// SCORE SCHEMAS
// ============================================================================

/**
 * Score factor schema
 */
export const scoreFactorSchema = z.object({
  name: z.string(),
  value: z.number(),
  weight: z.number(),
  contribution: z.number(),
  description: z.string(),
});

/**
 * Score factors (for a dimension) schema
 */
export const scoreFactorsSchema = z.object({
  factors: z.array(scoreFactorSchema),
  weight: z.number(),
  rawScore: z.number(),
  normalizedScore: z.number(),
});

/**
 * Score breakdown schema
 */
export const scoreBreakdownSchema = z.object({
  activity: scoreFactorsSchema,
  community: scoreFactorsSchema,
  maintenance: scoreFactorsSchema,
  popularity: scoreFactorsSchema,
  quality: scoreFactorsSchema,
});

/**
 * Repository score response schema
 */
export const repositoryScoreSchema = z.object({
  id: z.string().uuid(),
  repositoryId: z.string().uuid(),
  computedAt: z.string(),
  overallScore: z.number(),
  activityScore: z.number(),
  communityScore: z.number(),
  maintenanceScore: z.number(),
  popularityScore: z.number(),
  qualityScore: z.number(),
  scoreBreakdown: scoreBreakdownSchema,
  algorithmVersion: z.string(),
});

// ============================================================================
// RANKING SCHEMAS
// ============================================================================

/**
 * Ranking period enum
 */
export const rankingPeriodSchema = z.enum(['daily', 'weekly', 'monthly']);

/**
 * Ranking type enum
 */
export const rankingTypeSchema = z.enum([
  'overall',
  'activity',
  'community',
  'maintenance',
  'popularity',
  'quality',
]);

/**
 * Ranking request schema
 */
export const rankingsRequestSchema = z.object({
  period: rankingPeriodSchema.default('weekly'),
  type: rankingTypeSchema.default('overall'),
  language: z.string().optional(),
  asOf: z.string().date().optional(),
  ...paginationSchema.shape,
});

/**
 * Ranking explanation schema
 */
export const rankingExplanationSchema = z.object({
  topFactors: z.array(z.string()),
  comparedToAverage: z.record(z.string(), z.number()),
});

/**
 * Single ranking entry schema
 */
export const rankingEntrySchema = z.object({
  id: z.string().uuid(),
  period: rankingPeriodSchema,
  asOf: z.string(),
  rankingType: rankingTypeSchema,
  language: z.string().nullable(),
  repositoryId: z.string().uuid(),
  rank: z.number().int(),
  score: z.number(),
  rankChange: z.number().int(),
  rankingExplanation: rankingExplanationSchema,
  repository: repositorySummarySchema,
});

/**
 * Rankings response schema
 */
export const rankingsResponseSchema = z.object({
  data: z.array(rankingEntrySchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasMore: z.boolean(),
  }),
  metadata: z.object({
    period: rankingPeriodSchema,
    type: rankingTypeSchema,
    language: z.string().nullable(),
    asOf: z.string(),
  }),
});

// ============================================================================
// TIMESERIES SCHEMAS
// ============================================================================

/**
 * Timeseries request schema
 */
export const timeseriesRequestSchema = z.object({
  metrics: z.string().transform(s => s.split(',')).default(['stars', 'forks']),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
});

/**
 * Timeseries data point schema
 */
export const timeseriesDataPointSchema = z.object({
  date: z.string(),
  value: z.number(),
});

/**
 * Timeseries response schema
 */
export const timeseriesResponseSchema = z.object({
  repositoryId: z.string().uuid(),
  metrics: z.record(z.string(), z.array(timeseriesDataPointSchema)),
  from: z.string(),
  to: z.string(),
  granularity: z.string(),
});

// ============================================================================
// ALTERNATIVES SCHEMAS
// ============================================================================

/**
 * Alternatives request schema
 */
export const alternativesRequestSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * Alternative entry schema
 */
export const alternativeEntrySchema = z.object({
  repository: repositorySummarySchema,
  score: repositoryScoreSchema.nullable(),
  similarityScore: z.number(),
  matchReasons: z.array(z.string()),
});

/**
 * Alternatives response schema
 */
export const alternativesResponseSchema = z.object({
  seedRepository: repositorySummarySchema,
  alternatives: z.array(alternativeEntrySchema),
});

// ============================================================================
// COMPARE SCHEMAS
// ============================================================================

/**
 * Compare request schema
 * Accepts either an array of repos or a comma-separated string
 */
export const compareRequestSchema = z.object({
  repos: z.union([
    z.array(z.string()).min(2).max(5),
    z.string().transform(s => s.split(','))
  ]).refine(
    arr => arr.length >= 2 && arr.length <= 5,
    'Must compare between 2 and 5 repositories'
  ),
  metrics: z.union([
    z.array(z.string()),
    z.string().transform(s => s.split(','))
  ]).optional(),
});

/**
 * Compare entry schema
 */
export const compareEntrySchema = z.object({
  repository: repositorySchema,
  score: repositoryScoreSchema.nullable(),
  recentSnapshot: z.object({
    snapshotDate: z.string(),
    starsCount: z.number(),
    forksCount: z.number(),
    watchersCount: z.number(),
    openIssuesCount: z.number(),
    commitsLast30d: z.number(),
    prsOpenedLast30d: z.number(),
    prsMergedLast30d: z.number(),
    issuesOpenedLast30d: z.number(),
    issuesClosedLast30d: z.number(),
    contributorsCount: z.number(),
  }).nullable(),
});

/**
 * Compare response schema
 */
export const compareResponseSchema = z.object({
  repositories: z.array(compareEntrySchema),
  comparedAt: z.string(),
});

// ============================================================================
// REPORT SCHEMAS
// ============================================================================

/**
 * Report config schema
 */
export const reportConfigSchema = z.object({
  metrics: z.array(z.string()),
  timeRange: z.object({
    start: z.string(),
    end: z.string(),
  }),
  chartTypes: z.array(z.string()),
});

/**
 * Create report request schema
 */
export const createReportRequestSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  repositoryIds: z.array(z.string().uuid()).min(1).max(10),
  config: reportConfigSchema.optional(),
  isPublic: z.boolean().default(false),
});

/**
 * Report response schema
 */
export const reportSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  repositoryIds: z.array(z.string().uuid()),
  config: reportConfigSchema,
  isPublic: z.boolean(),
  shareToken: z.string().nullable(),
  createdBy: z.string().nullable(),
  viewCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  repositories: z.array(repositorySummarySchema),
});

// ============================================================================
// JOB SCHEMAS (Internal)
// ============================================================================

/**
 * Job type enum
 */
export const jobTypeSchema = z.enum([
  'repo.refresh',
  'repo.daily_snapshot',
  'repo.signals',
  'repo.score',
  'rankings.compute',
]);

/**
 * Job status enum
 */
export const jobStatusSchema = z.enum(['queued', 'running', 'done', 'failed']);

/**
 * Run jobs request schema (internal endpoint)
 */
export const runJobsRequestSchema = z.object({
  batchSize: z.coerce.number().int().min(1).max(100).default(10),
  types: z.array(jobTypeSchema).optional(),
});

/**
 * Run jobs response schema
 */
export const runJobsResponseSchema = z.object({
  processed: z.number().int(),
  succeeded: z.number().int(),
  failed: z.number().int(),
  duration: z.number(),
  jobs: z.array(z.object({
    id: z.string().uuid(),
    type: z.string(),
    status: z.string(),
    duration: z.number().optional(),
    error: z.string().optional(),
  })),
});

// ============================================================================
// ERROR SCHEMAS
// ============================================================================

/**
 * API error response schema
 */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
    requestId: z.string().optional(),
  }),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PaginationParams = z.infer<typeof paginationSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type RepositorySummary = z.infer<typeof repositorySummarySchema>;
export type Repository = z.infer<typeof repositorySchema>;
export type RepositoryScore = z.infer<typeof repositoryScoreSchema>;
export type RankingsRequest = z.infer<typeof rankingsRequestSchema>;
export type RankingsResponse = z.infer<typeof rankingsResponseSchema>;
export type RankingEntry = z.infer<typeof rankingEntrySchema>;
export type TimeseriesRequest = z.infer<typeof timeseriesRequestSchema>;
export type TimeseriesResponse = z.infer<typeof timeseriesResponseSchema>;
export type AlternativesRequest = z.infer<typeof alternativesRequestSchema>;
export type AlternativesResponse = z.infer<typeof alternativesResponseSchema>;
export type CompareRequest = z.infer<typeof compareRequestSchema>;
export type CompareResponse = z.infer<typeof compareResponseSchema>;
export type CreateReportRequest = z.infer<typeof createReportRequestSchema>;
export type Report = z.infer<typeof reportSchema>;
export type RunJobsRequest = z.infer<typeof runJobsRequestSchema>;
export type RunJobsResponse = z.infer<typeof runJobsResponseSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
