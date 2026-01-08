/**
 * ============================================================================
 * DISCOVER: Repository API Route
 * Description: Get repository details and profile
 * ============================================================================
 */

import { type NextRequest } from 'next/server';
import { getRepositoryProfile } from '@/application';
import {
  createRequestContext,
  jsonResponse,
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
 * GET /api/v1/repos/[owner]/[name]
 * Get repository profile with score and ranking
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const ctx = createRequestContext(request);
  const { owner, name } = await params;

  try {
    // Rate limiting
    const rateLimitKey = buildRateLimitKey(ctx.ip, '/api/v1/repos');
    const limiter = getRateLimiter();
    const rateLimitResult = await limiter.limit(rateLimitKey, RateLimits.PUBLIC);

    if (!rateLimitResult.allowed) {
      return jsonResponse(
        { error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' } },
        ctx,
        { status: 429 }
      );
    }

    // Get repository profile
    const profile = await getRepositoryProfile(owner, name);

    if (!profile) {
      return notFound(`Repository ${owner}/${name} not found`, ctx);
    }

    // Build response
    const response = {
      repository: {
        id: profile.repository.id,
        owner: profile.repository.owner,
        name: profile.repository.name,
        fullName: profile.repository.fullName,
        description: profile.repository.description,
        homepageUrl: profile.repository.homepageUrl,
        language: profile.repository.language,
        topics: profile.repository.topics,
        starsCount: profile.repository.starsCount,
        forksCount: profile.repository.forksCount,
        watchersCount: profile.repository.watchersCount,
        openIssuesCount: profile.repository.openIssuesCount,
        isFork: profile.repository.isFork,
        isArchived: profile.repository.isArchived,
        hasWiki: profile.repository.hasWiki,
        hasIssues: profile.repository.hasIssues,
        hasDiscussions: profile.repository.hasDiscussions,
        licenseKey: profile.repository.licenseKey,
        licenseName: profile.repository.licenseName,
        githubCreatedAt: profile.repository.githubCreatedAt?.toISOString() ?? null,
        githubUpdatedAt: profile.repository.githubUpdatedAt?.toISOString() ?? null,
        githubPushedAt: profile.repository.githubPushedAt?.toISOString() ?? null,
        lastSyncedAt: profile.repository.lastSyncedAt?.toISOString() ?? null,
      },
      score: profile.score ? {
        overallScore: profile.score.overallScore,
        activityScore: profile.score.activityScore,
        communityScore: profile.score.communityScore,
        maintenanceScore: profile.score.maintenanceScore,
        popularityScore: profile.score.popularityScore,
        qualityScore: profile.score.qualityScore,
        computedAt: profile.score.computedAt.toISOString(),
        algorithmVersion: profile.score.algorithmVersion,
      } : null,
      ranking: profile.ranking ? {
        rank: profile.ranking.rank,
        rankChange: profile.ranking.rankChange,
        period: profile.ranking.period,
        asOf: profile.ranking.asOf.toISOString().split('T')[0],
      } : null,
      snapshot: profile.latestSnapshot ? {
        date: profile.latestSnapshot.snapshotDate.toISOString().split('T')[0],
        contributorsCount: profile.latestSnapshot.contributorsCount,
        commitsLast30d: profile.latestSnapshot.commitsLast30d,
        prsOpenedLast30d: profile.latestSnapshot.prsOpenedLast30d,
        prsMergedLast30d: profile.latestSnapshot.prsMergedLast30d,
        issuesOpenedLast30d: profile.latestSnapshot.issuesOpenedLast30d,
        issuesClosedLast30d: profile.latestSnapshot.issuesClosedLast30d,
      } : null,
    };

    return jsonResponse(response, ctx, {
      cacheControl: 'public, max-age=300, stale-while-revalidate=600',
    });
  } catch (error) {
    return internalError('Failed to get repository', ctx, error);
  }
}
