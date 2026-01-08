/**
 * ============================================================================
 * DISCOVER: Rankings API Route
 * Description: Get repository rankings by various criteria
 * ============================================================================
 */

import { type NextRequest } from 'next/server';
import { getRankings } from '@/application';
import { rankingsRequestSchema } from '@/contracts';
import type { RankingPeriod, RankingType } from '@/core/types';
import {
  createRequestContext,
  jsonResponse,
  badRequest,
  internalError,
} from '@/server/http/responses';
import { getRateLimiter, RateLimits, buildRateLimitKey } from '@/server/rateLimit';

/**
 * GET /api/v1/rankings
 * Get repository rankings
 * Query params:
 *   - type: 'overall' | 'language' | 'trending' | 'rising'
 *   - period: 'daily' | 'weekly' | 'monthly' | 'all_time'
 *   - language: optional language filter
 *   - page: page number (default: 1)
 *   - limit: results per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  const ctx = createRequestContext(request);

  try {
    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const query = {
      type: searchParams.get('type') ?? 'overall',
      period: searchParams.get('period') ?? 'weekly',
      language: searchParams.get('language') ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
    };

    // Validate request
    const validation = rankingsRequestSchema.safeParse(query);
    if (!validation.success) {
      return badRequest(
        `Validation error: ${validation.error.issues.map((e: { message: string }) => e.message).join(', ')}`,
        ctx
      );
    }

    // Rate limiting
    const rateLimitKey = buildRateLimitKey(ctx.ip, '/api/v1/rankings');
    const limiter = getRateLimiter();
    const rateLimitResult = await limiter.limit(rateLimitKey, RateLimits.PUBLIC);

    if (!rateLimitResult.allowed) {
      return jsonResponse(
        { error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' } },
        ctx,
        { status: 429 }
      );
    }

    const { type, period, language, page, limit } = validation.data;

    // Get rankings
    const result = await getRankings({
      type: type as RankingType,
      period: period as RankingPeriod,
      language,
      page,
      limit,
    });

    // Build response
    const response = {
      rankings: result.data.map((item) => ({
        rank: item.rank,
        rankChange: item.rankChange,
        repository: {
          owner: item.repository.owner,
          name: item.repository.name,
          fullName: item.repository.fullName,
          description: item.repository.description,
          language: item.repository.language,
          topics: item.repository.topics,
          starsCount: item.repository.starsCount,
          forksCount: item.repository.forksCount,
        },
        score: item.score,
      })),
      filters: {
        type,
        period,
        language: language ?? null,
      },
      pagination: {
        page,
        limit,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages,
        hasMore: result.pagination.hasMore,
      },
      metadata: {
        asOf: result.metadata.asOf,
      },
    };

    return jsonResponse(response, ctx, {
      cacheControl: 'public, max-age=300, stale-while-revalidate=600',
    });
  } catch (error) {
    return internalError('Failed to get rankings', ctx, error);
  }
}
