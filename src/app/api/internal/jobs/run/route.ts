/**
 * ============================================================================
 * DISCOVER: Internal Jobs Runner API Route
 * Description: Trigger background job processing (internal use only)
 * ============================================================================
 */

import { type NextRequest } from 'next/server';
import { runJobsRequestSchema } from '@/contracts';
import { processBatch } from '@/server/jobs/handlers';
import { verifyInternalSecret } from '@/server/auth/internal';
import {
  createRequestContext,
  jsonResponse,
  unauthorized,
  badRequest,
  internalError,
} from '@/server/http/responses';
import { logger } from '@/lib/logger';

/**
 * POST /api/internal/jobs/run
 * Trigger job processing (called by cron or external scheduler)
 * Requires x-internal-secret header for authentication
 * Body: { limit?: number }
 */
export async function POST(request: NextRequest) {
  const ctx = createRequestContext(request);

  try {
    // Verify internal authentication
    const authResult = verifyInternalSecret(request);
    if (!authResult.authenticated) {
      logger.warn('Unauthorized job run attempt', {
        ip: ctx.ip,
        reason: authResult.error,
      });
      return unauthorized('Unauthorized', ctx);
    }

    // Parse and validate request body
    let body: unknown = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      return badRequest('Invalid JSON body', ctx);
    }

    const validation = runJobsRequestSchema.safeParse(body);
    if (!validation.success) {
      return badRequest(
        `Validation error: ${validation.error.issues.map((e: { message: string }) => e.message).join(', ')}`,
        ctx
      );
    }

    const { batchSize: limit } = validation.data;

    logger.info('Starting job processing', { limit });

    const startTime = Date.now();
    // Process jobs
    const result = await processBatch(limit);
    const durationMs = Date.now() - startTime;

    logger.info('Job processing complete', {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      duration: durationMs,
    });

    // Build response
    const response = {
      success: true,
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      durationMs,
      results: result.results.map((r: { jobId: string; type: string; success: boolean; duration: number; error?: string }) => ({
        jobId: r.jobId,
        jobType: r.type,
        success: r.success,
        error: r.error ?? null,
        durationMs: r.duration,
      })),
    };

    return jsonResponse(response, ctx);
  } catch (error) {
    return internalError('Failed to run jobs', ctx, error);
  }
}

/**
 * GET /api/internal/jobs/run
 * Get job queue status (for monitoring)
 * Requires x-internal-secret header for authentication
 */
export async function GET(request: NextRequest) {
  const ctx = createRequestContext(request);

  try {
    // Verify internal authentication
    const authResult = verifyInternalSecret(request);
    if (!authResult.authenticated) {
      return unauthorized('Unauthorized', ctx);
    }

    // Get job stats from database
    const { getJobStats } = await import('@/dal/jobs.repo');
    const stats = await getJobStats();

    const response = {
      stats: {
        pending: stats.queued,
        running: stats.running,
        completed: stats.done,
        failed: stats.failed,
        total: stats.total,
      },
      byType: stats.byType,
    };

    return jsonResponse(response, ctx);
  } catch (error) {
    return internalError('Failed to get job stats', ctx, error);
  }
}
