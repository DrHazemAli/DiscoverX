/**
 * ============================================================================
 * DISCOVER: Repository Schemas
 * Description: Validation schemas for repository endpoints
 * ============================================================================
 */

import { z } from 'zod';
import {
  paginationSchema,
  githubName,
  languageFilter,
  searchQuerySchema,
  sortOrderSchema,
  dateString,
  score,
  percentage,
} from './common';

// ============================================================================
// REPOSITORY IDENTIFIERS
// ============================================================================

/**
 * Repository path params (owner/name)
 */
export const repoParamsSchema = z.object({
  owner: githubName,
  name: githubName,
});

export type RepoParams = z.infer<typeof repoParamsSchema>;

/**
 * Full repository name (owner/name format)
 */
export const repoFullNameSchema = z
  .string()
  .min(3)
  .max(201)
  .regex(
    /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?\/[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/,
    'Invalid repository format. Use owner/name'
  );

// ============================================================================
// SEARCH
// ============================================================================

const ALLOWED_SORT_COLUMNS = [
  'stars',
  'forks',
  'score',
  'updated',
  'created',
] as const;

export const searchReposSchema = z.object({
  q: searchQuerySchema,
  language: languageFilter,
  minStars: z.coerce.number().int().min(0).max(10000000).optional(),
  maxStars: z.coerce.number().int().min(0).max(10000000).optional(),
  minScore: score.optional(),
  maxScore: score.optional(),
  topic: z.string().max(50).optional(),
  sortBy: z.enum(ALLOWED_SORT_COLUMNS).default('score'),
  sortOrder: sortOrderSchema,
  ...paginationSchema.shape,
}).refine(
  (data) => {
    if (data.minStars !== undefined && data.maxStars !== undefined) {
      return data.minStars <= data.maxStars;
    }
    return true;
  },
  { message: 'minStars must be less than or equal to maxStars' }
);

export type SearchReposParams = z.infer<typeof searchReposSchema>;

// ============================================================================
// REPOSITORY DETAIL
// ============================================================================

export const getRepoSchema = z.object({
  owner: githubName,
  name: githubName,
  includeScore: z.coerce.boolean().default(true),
  includeSnapshot: z.coerce.boolean().default(true),
});

export type GetRepoParams = z.infer<typeof getRepoSchema>;

// ============================================================================
// TIME SERIES
// ============================================================================

export const timeSeriesSchema = z.object({
  owner: githubName,
  name: githubName,
  days: z.coerce.number().int().min(7).max(365).default(30),
  metrics: z
    .string()
    .optional()
    .transform((s) =>
      s ? s.split(',').filter((m) => ALLOWED_METRICS.includes(m as MetricType)) : ['stars', 'forks', 'score']
    ),
});

const ALLOWED_METRICS = [
  'stars',
  'forks',
  'watchers',
  'issues',
  'prs',
  'commits',
  'contributors',
  'score',
] as const;

type MetricType = (typeof ALLOWED_METRICS)[number];

export type TimeSeriesParams = z.infer<typeof timeSeriesSchema>;

// ============================================================================
// ALTERNATIVES
// ============================================================================

export const alternativesSchema = z.object({
  owner: githubName,
  name: githubName,
  limit: z.coerce.number().int().min(1).max(50).default(10),
  minSimilarity: z.coerce.number().min(0).max(1).default(0.3),
});

export type AlternativesParams = z.infer<typeof alternativesSchema>;

// ============================================================================
// COMPARE
// ============================================================================

export const compareReposSchema = z.object({
  repos: z
    .string()
    .transform((s) => s.split(',').map((r) => r.trim()).filter(Boolean))
    .pipe(
      z.array(repoFullNameSchema).min(2, 'At least 2 repositories required').max(5, 'Maximum 5 repositories')
    ),
  metrics: z
    .string()
    .optional()
    .transform((s) =>
      s ? s.split(',').filter(Boolean) : ['score', 'stars', 'forks', 'activity']
    ),
});

export type CompareReposParams = z.infer<typeof compareReposSchema>;

// ============================================================================
// RESPONSE DTOS
// ============================================================================

/**
 * Repository summary (list view)
 */
export const repoSummarySchema = z.object({
  id: z.string().uuid(),
  owner: z.string(),
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  language: z.string().nullable(),
  topics: z.array(z.string()),
  starsCount: z.number().int().nonnegative(),
  forksCount: z.number().int().nonnegative(),
  score: score.nullable(),
  updatedAt: z.string().datetime(),
});

export type RepoSummary = z.infer<typeof repoSummarySchema>;

/**
 * Repository detail (full view)
 */
export const repoDetailSchema = repoSummarySchema.extend({
  watchersCount: z.number().int().nonnegative(),
  openIssuesCount: z.number().int().nonnegative(),
  licenseKey: z.string().nullable(),
  licenseName: z.string().nullable(),
  hasIssues: z.boolean(),
  hasWiki: z.boolean(),
  hasDiscussions: z.boolean(),
  isArchived: z.boolean(),
  isTemplate: z.boolean(),
  defaultBranch: z.string(),
  homepageUrl: z.string().nullable(),
  githubCreatedAt: z.string().datetime(),
  githubPushedAt: z.string().datetime().nullable(),
  scoreBreakdown: z
    .object({
      overall: score,
      activity: score,
      community: score,
      maintenance: score,
      popularity: score,
      quality: score,
    })
    .nullable(),
  ranking: z
    .object({
      rank: z.number().int().positive(),
      rankChange: z.number().int().nullable(),
      percentile: percentage,
    })
    .nullable(),
});

export type RepoDetail = z.infer<typeof repoDetailSchema>;

/**
 * Time series data point
 */
export const timeSeriesPointSchema = z.object({
  date: dateString,
  value: z.number(),
});

export type TimeSeriesPoint = z.infer<typeof timeSeriesPointSchema>;

/**
 * Time series response
 */
export const timeSeriesResponseSchema = z.object({
  repo: z.string(),
  metric: z.string(),
  data: z.array(timeSeriesPointSchema),
  from: dateString,
  to: dateString,
});

export type TimeSeriesResponse = z.infer<typeof timeSeriesResponseSchema>;

// ============================================================================
// EXPORTS
// ============================================================================

export const repoSchemas = {
  params: repoParamsSchema,
  fullName: repoFullNameSchema,
  search: searchReposSchema,
  get: getRepoSchema,
  timeSeries: timeSeriesSchema,
  alternatives: alternativesSchema,
  compare: compareReposSchema,
  // Response DTOs
  summary: repoSummarySchema,
  detail: repoDetailSchema,
  timeSeriesPoint: timeSeriesPointSchema,
  timeSeriesResponse: timeSeriesResponseSchema,
};
