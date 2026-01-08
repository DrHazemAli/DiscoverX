/**
 * ============================================================================
 * DISCOVER: Time Series API Route
 * Description: Get historical data for a repository
 * ============================================================================
 */

import { type NextRequest } from 'next/server';
import { getTimeseries, getRepositoryProfile } from '@/application';
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
 * GET /api/v1/repos/[owner]/[name]/timeseries
 * Get historical metrics for a repository
 * Query params: metrics, days (default: 30)
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
    const metricsParam = searchParams.get('metrics') ?? 'stars,forks';
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam, 10) : 30;

    // Validate days
    if (isNaN(days) || days < 1 || days > 365) {
      return badRequest('Days must be between 1 and 365', ctx);
    }

    // Rate limiting
    const rateLimitKey = buildRateLimitKey(ctx.ip, '/api/v1/repos/timeseries');
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

    // Parse metrics
    const metrics = metricsParam.split(',').map(m => m.trim());

    // Get time series data
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const timeSeries = await getTimeseries({
      repositoryId: profile.repository.id,
      metrics,
      from: fromDate,
      to: new Date(),
      granularity: 'daily',
    });

    // Build response
    const response = {
      repository: {
        id: profile.repository.id,
        owner: profile.repository.owner,
        name: profile.repository.name,
        fullName: profile.repository.fullName,
      },
      period: {
        from: timeSeries.from,
        to: timeSeries.to,
        days,
        granularity: timeSeries.granularity,
      },
      metrics: timeSeries.metrics,
    };

    return jsonResponse(response, ctx, {
      cacheControl: 'public, max-age=3600, stale-while-revalidate=7200',
    });
  } catch (error) {
    return internalError('Failed to get time series data', ctx, error);
  }
}
