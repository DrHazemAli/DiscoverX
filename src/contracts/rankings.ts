/**
 * ============================================================================
 * DISCOVER: Rankings Schemas
 * Description: Validation schemas for rankings endpoints
 * ============================================================================
 */

import { z } from 'zod';
import { paginationSchema, languageFilter, dateString, score } from './common';

// ============================================================================
// RANKING TYPES
// ============================================================================

export const rankingPeriodSchema = z.enum(['daily', 'weekly', 'monthly']);
export type RankingPeriod = z.infer<typeof rankingPeriodSchema>;

export const rankingTypeSchema = z.enum([
  'overall',
  'activity',
  'community',
  'maintenance',
  'popularity',
  'quality',
]);
export type RankingType = z.infer<typeof rankingTypeSchema>;

// ============================================================================
// GET RANKINGS
// ============================================================================

export const getRankingsSchema = z.object({
  period: rankingPeriodSchema.default('daily'),
  type: rankingTypeSchema.default('overall'),
  language: languageFilter,
  asOf: dateString.optional(),
  ...paginationSchema.shape,
});

export type GetRankingsParams = z.infer<typeof getRankingsSchema>;

// ============================================================================
// COMPUTE RANKINGS (Internal)
// ============================================================================

export const computeRankingsSchema = z.object({
  period: rankingPeriodSchema,
  asOf: dateString.optional(),
  type: rankingTypeSchema.optional(),
  force: z.coerce.boolean().default(false),
});

export type ComputeRankingsParams = z.infer<typeof computeRankingsSchema>;

// ============================================================================
// RESPONSE DTOS
// ============================================================================

/**
 * Single ranking entry
 */
export const rankingEntrySchema = z.object({
  rank: z.number().int().positive(),
  previousRank: z.number().int().positive().nullable(),
  rankChange: z.number().int().nullable(),
  repository: z.object({
    id: z.string().uuid(),
    owner: z.string(),
    name: z.string(),
    fullName: z.string(),
    description: z.string().nullable(),
    language: z.string().nullable(),
    starsCount: z.number().int().nonnegative(),
    forksCount: z.number().int().nonnegative(),
  }),
  score: score,
  scoreBreakdown: z.object({
    activity: score,
    community: score,
    maintenance: score,
    popularity: score,
    quality: score,
  }),
});

export type RankingEntry = z.infer<typeof rankingEntrySchema>;

/**
 * Rankings list response
 */
export const rankingsResponseSchema = z.object({
  period: rankingPeriodSchema,
  type: rankingTypeSchema,
  asOf: dateString,
  rankings: z.array(rankingEntrySchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  }),
  filters: z.object({
    language: z.string().nullable(),
  }),
  metadata: z.object({
    computedAt: z.string().datetime(),
    totalRepositories: z.number().int().nonnegative(),
    availableLanguages: z.array(z.string()),
  }),
});

export type RankingsResponse = z.infer<typeof rankingsResponseSchema>;

// ============================================================================
// TRENDING
// ============================================================================

export const trendingPeriodSchema = z.enum(['today', 'week', 'month']);
export type TrendingPeriod = z.infer<typeof trendingPeriodSchema>;

export const getTrendingSchema = z.object({
  period: trendingPeriodSchema.default('today'),
  language: languageFilter,
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type GetTrendingParams = z.infer<typeof getTrendingSchema>;

// ============================================================================
// EXPORTS
// ============================================================================

export const rankingSchemas = {
  period: rankingPeriodSchema,
  type: rankingTypeSchema,
  get: getRankingsSchema,
  compute: computeRankingsSchema,
  trending: getTrendingSchema,
  trendingPeriod: trendingPeriodSchema,
  // Response DTOs
  entry: rankingEntrySchema,
  response: rankingsResponseSchema,
};
