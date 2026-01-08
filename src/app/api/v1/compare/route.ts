/**
 * ============================================================================
 * DISCOVER: Compare Repositories API Route
 * Description: Compare multiple repositories side-by-side
 * ============================================================================
 */

import { type NextRequest } from 'next/server';
import { compareRepositories } from '@/application';
import { compareRequestSchema } from '@/contracts';
import {
  createRequestContext,
  jsonResponse,
  badRequest,
  internalError,
} from '@/server/http/responses';
import { getRateLimiter, RateLimits, buildRateLimitKey } from '@/server/rateLimit';

/**
 * POST /api/v1/compare
 * Compare multiple repositories
 * Body: { repos: ["owner/name", "owner2/name2", ...] }
 */
export async function POST(request: NextRequest) {
  const ctx = createRequestContext(request);

  try {
    // Rate limiting
    const rateLimitKey = buildRateLimitKey(ctx.ip, '/api/v1/compare');
    const limiter = getRateLimiter();
    const rateLimitResult = await limiter.limit(rateLimitKey, RateLimits.PUBLIC);

    if (!rateLimitResult.allowed) {
      return jsonResponse(
        { error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' } },
        ctx,
        { status: 429 }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON body', ctx);
    }

    const validation = compareRequestSchema.safeParse(body);
    if (!validation.success) {
      return badRequest(
        `Validation error: ${validation.error.issues.map((e: { message: string }) => e.message).join(', ')}`,
        ctx
      );
    }

    const { repos } = validation.data;

    // Compare repositories
    const result = await compareRepositories({ repos });

    // Build response
    const response = {
      repositories: result.repositories.map((item) => ({
        owner: item.repository.owner,
        name: item.repository.name,
        fullName: item.repository.fullName,
        description: item.repository.description,
        language: item.repository.language,
        topics: item.repository.topics,
        starsCount: item.repository.starsCount,
        forksCount: item.repository.forksCount,
        watchersCount: item.repository.watchersCount,
        openIssuesCount: item.repository.openIssuesCount,
        licenseKey: item.repository.licenseKey,
        licenseName: item.repository.licenseName,
        isArchived: item.repository.isArchived,
        hasWiki: item.repository.hasWiki,
        hasIssues: item.repository.hasIssues,
        hasDiscussions: item.repository.hasDiscussions,
        githubCreatedAt: item.repository.githubCreatedAt?.toISOString() ?? null,
        githubPushedAt: item.repository.githubPushedAt?.toISOString() ?? null,
        score: item.score ? {
          overallScore: item.score.overallScore,
          activityScore: item.score.activityScore,
          communityScore: item.score.communityScore,
          maintenanceScore: item.score.maintenanceScore,
          popularityScore: item.score.popularityScore,
          qualityScore: item.score.qualityScore,
        } : null,
        snapshot: item.recentSnapshot ? {
          contributorsCount: item.recentSnapshot.contributorsCount,
          commitsLast30d: item.recentSnapshot.commitsLast30d,
          prsOpenedLast30d: item.recentSnapshot.prsOpenedLast30d,
          prsMergedLast30d: item.recentSnapshot.prsMergedLast30d,
          issuesOpenedLast30d: item.recentSnapshot.issuesOpenedLast30d,
          issuesClosedLast30d: item.recentSnapshot.issuesClosedLast30d,
        } : null,
      })),
      comparison: {
        // Calculate rankings within comparison
        byStars: sortedIndices(result.repositories, (r) => r.repository.starsCount),
        byScore: sortedIndices(result.repositories, (r) => r.score?.overallScore ?? 0),
        byActivity: sortedIndices(result.repositories, (r) => r.score?.activityScore ?? 0),
        byCommunity: sortedIndices(result.repositories, (r) => r.score?.communityScore ?? 0),
        byMaintenance: sortedIndices(result.repositories, (r) => r.score?.maintenanceScore ?? 0),
      },
      summary: {
        totalRequested: repos.length,
        totalFound: result.repositories.length,
        notFound: repos.length - result.repositories.length,
        averageScore: calculateAverage(result.repositories.map(r => r.score?.overallScore ?? 0)),
        highestScored: result.repositories.reduce((best, curr) => {
          const currScore = curr.score?.overallScore ?? 0;
          const bestScore = best.score?.overallScore ?? 0;
          return currScore > bestScore ? curr : best;
        }, result.repositories[0])?.repository.fullName ?? null,
      },
    };

    return jsonResponse(response, ctx, {
      cacheControl: 'public, max-age=300, stale-while-revalidate=600',
    });
  } catch (error) {
    return internalError('Failed to compare repositories', ctx, error);
  }
}

/**
 * Get sorted indices by a value extractor (descending order)
 */
function sortedIndices<T>(
  items: T[],
  getValue: (item: T) => number
): string[] {
  return items
    .map((item, index) => ({ item, index, value: getValue(item) }))
    .sort((a, b) => b.value - a.value)
    .map((entry) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const repo = (entry.item as any).repository;
      return repo?.fullName ?? `index:${entry.index}`;
    });
}

/**
 * Calculate average of numbers
 */
function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return Math.round((numbers.reduce((a, b) => a + b, 0) / numbers.length) * 10) / 10;
}
