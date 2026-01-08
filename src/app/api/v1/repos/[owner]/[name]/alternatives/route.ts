/**
 * ============================================================================
 * DISCOVER: Alternatives API Route
 * Description: Find similar repositories
 * ============================================================================
 */

import { type NextRequest } from 'next/server';
import { getAlternatives, getRepositoryProfile } from '@/application';
import {
  createRequestContext,
  jsonResponse,
  badRequest,
  notFound,
  internalError,
} from '@/server/http/responses';
import { getRateLimiter, RateLimits, buildRateLimitKey } from '@/server/rateLimit';

interface RouteParams {
  params: Promise<{
    owner: string;
    name: string;
  }>;
}

/**
 * GET /api/v1/repos/[owner]/[name]/alternatives
 * Find similar repositories
 * Query params: limit (default: 10, max: 50)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const ctx = createRequestContext(request);
  const { owner, name } = await params;

  try {
    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 50) {
      return badRequest('Limit must be between 1 and 50', ctx);
    }

    // Rate limiting
    const rateLimitKey = buildRateLimitKey(ctx.ip, '/api/v1/repos/alternatives');
    const limiter = getRateLimiter();
    const rateLimitResult = await limiter.limit(rateLimitKey, RateLimits.PUBLIC);

    if (!rateLimitResult.allowed) {
      return jsonResponse(
        { error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' } },
        ctx,
        { status: 429 }
      );
    }

    // Get repository first to get ID
    const profile = await getRepositoryProfile(owner, name);
    if (!profile) {
      return notFound(`Repository ${owner}/${name} not found`, ctx);
    }

    // Find alternatives
    const result = await getAlternatives({
      repositoryId: profile.repository.id,
      limit,
    });

    if (!result) {
      return notFound(`Repository ${owner}/${name} not found`, ctx);
    }

    // Build response
    const response = {
      source: {
        id: result.seedRepository.id,
        owner: result.seedRepository.owner,
        name: result.seedRepository.name,
        fullName: result.seedRepository.fullName,
        language: result.seedRepository.language,
        topics: result.seedRepository.topics,
      },
      alternatives: result.alternatives.map((alt) => ({
        repository: {
          id: alt.repository.id,
          owner: alt.repository.owner,
          name: alt.repository.name,
          fullName: alt.repository.fullName,
          description: alt.repository.description,
          language: alt.repository.language,
          topics: alt.repository.topics,
          starsCount: alt.repository.starsCount,
          forksCount: alt.repository.forksCount,
        },
        score: alt.score ? {
          overallScore: alt.score.overallScore,
          activityScore: alt.score.activityScore,
          communityScore: alt.score.communityScore,
          maintenanceScore: alt.score.maintenanceScore,
          popularityScore: alt.score.popularityScore,
          qualityScore: alt.score.qualityScore,
        } : null,
        similarityScore: alt.similarityScore,
        matchReasons: alt.matchReasons,
      })),
      metadata: {
        limit,
        totalFound: result.alternatives.length,
      },
    };

    return jsonResponse(response, ctx, {
      cacheControl: 'public, max-age=3600, stale-while-revalidate=7200',
    });
  } catch (error) {
    return internalError('Failed to find alternatives', ctx, error);
  }
}
