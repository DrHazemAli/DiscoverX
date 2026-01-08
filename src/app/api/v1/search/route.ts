/**
 * ============================================================================
 * DISCOVER: Search API Route
 * Description: Search and filter repositories
 * ============================================================================
 */

import { type NextRequest } from 'next/server';
import { searchRequestSchema } from '@/contracts';
import { searchRepositories } from '@/application';
import {
  createRequestContext,
  jsonResponse,
  validationError,
  internalError,
} from '@/server/http/responses';
import { getRateLimiter, RateLimits, buildRateLimitKey } from '@/server/rateLimit';
import { rateLimited } from '@/server/http/responses';

/**
 * GET /api/v1/search
 * Search repositories with filters
 */
export async function GET(request: NextRequest) {
  const ctx = createRequestContext(request);

  try {
    // Rate limiting
    const rateLimitKey = buildRateLimitKey(ctx.ip, '/api/v1/search');
    const limiter = getRateLimiter();
    const rateLimitResult = await limiter.limit(rateLimitKey, RateLimits.SEARCH);

    if (!rateLimitResult.allowed) {
      return rateLimited('Search rate limit exceeded', ctx, 60);
    }

    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const validationResult = searchRequestSchema.safeParse(searchParams);

    if (!validationResult.success) {
      return validationError(validationResult.error, ctx);
    }

    const params = validationResult.data;

    // Execute search
    const result = await searchRepositories({
      query: params.query,
      language: params.language,
      minStars: params.minStars,
      maxStars: params.maxStars,
      topics: params.topics,
      hasIssues: params.hasIssues,
      hasDiscussions: params.hasDiscussions,
      isArchived: params.isArchived,
      sort: params.sort,
      order: params.order,
      page: params.page,
      limit: params.limit,
    });

    // Return response with rate limit headers
    return jsonResponse(result, ctx, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      },
      cacheControl: 'public, max-age=60, stale-while-revalidate=300',
    });
  } catch (error) {
    return internalError('Search failed', ctx, error);
  }
}
