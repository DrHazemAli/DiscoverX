/**
 * ============================================================================
 * DISCOVER: Jobs Repository
 * Description: Data access layer for job queue operations
 * ============================================================================
 */

import 'server-only';
import type { Job, JobType, JobStatus, JobPayloads } from '@/core/types';
import { getAdminClient, type DbJob } from './db';

// ============================================================================
// MAPPER FUNCTIONS
// ============================================================================

/**
 * Map database row to domain Job
 */
function mapToJob(row: DbJob): Job {
  return {
    id: row.id,
    type: row.type as JobType,
    payload: row.payload,
    status: row.status as JobStatus,
    priority: row.priority,
    runAt: new Date(row.run_at),
    lockedAt: row.locked_at ? new Date(row.locked_at) : null,
    lockedBy: row.locked_by,
    attempt: row.attempt,
    maxAttempts: row.max_attempts,
    lastError: row.last_error,
    result: row.result,
    createdAt: new Date(row.created_at),
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
  };
}

// ============================================================================
// JOB QUERIES
// ============================================================================

/**
 * Get a job by ID
 */
export async function getJobById(id: string): Promise<Job | null> {
  const client = getAdminClient();
  
  const { data, error } = await client
    .from('job_queue')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return mapToJob(data as DbJob);
}

/**
 * Dequeue jobs for processing (using database function)
 */
export async function dequeueJobs(
  batchSize: number = 10,
  workerId: string = `worker-${Date.now()}`,
  jobTypes?: JobType[]
): Promise<Job[]> {
  const client = getAdminClient();
  
  // Call the database function
  const { data, error } = await client.rpc('dequeue_jobs', {
    p_batch_size: batchSize,
    p_worker_id: workerId,
    p_job_types: jobTypes ?? null,
  });

  if (error) {
    console.error('Dequeue jobs error:', error);
    return [];
  }

  if (!data || !Array.isArray(data)) return [];

  // Fetch full job details
  const jobIds = data.map((j: { id: string }) => j.id);
  if (jobIds.length === 0) return [];

  const { data: jobs } = await client
    .from('job_queue')
    .select('*')
    .in('id', jobIds);

  return (jobs as DbJob[] ?? []).map(mapToJob);
}

/**
 * Get job queue statistics
 */
export async function getJobStats(): Promise<{
  queued: number;
  running: number;
  done: number;
  failed: number;
  total: number;
  byType: Record<string, number>;
}> {
  const client = getAdminClient();
  
  const { data, error } = await client.rpc('get_job_stats');

  if (error || !data) {
    console.error('Get job stats error:', error);
    return {
      queued: 0,
      running: 0,
      done: 0,
      failed: 0,
      total: 0,
      byType: {},
    };
  }

  return data as {
    queued: number;
    running: number;
    done: number;
    failed: number;
    total: number;
    byType: Record<string, number>;
  };
}

/**
 * Get recent jobs (for monitoring)
 */
export async function getRecentJobs(
  limit: number = 50,
  status?: JobStatus
): Promise<Job[]> {
  const client = getAdminClient();
  
  let query = client
    .from('job_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error || !data) return [];
  return (data as DbJob[]).map(mapToJob);
}

// ============================================================================
// JOB MUTATIONS
// ============================================================================

/**
 * Enqueue a new job
 */
export async function enqueueJob<T extends JobType>(
  type: T,
  payload: JobPayloads[T],
  options?: {
    priority?: number;
    runAt?: Date;
    maxAttempts?: number;
  }
): Promise<string | null> {
  const client = getAdminClient();
  
  const { data, error } = await client.rpc('enqueue_job', {
    p_type: type,
    p_payload: payload,
    p_priority: options?.priority ?? 3,
    p_run_at: options?.runAt?.toISOString() ?? new Date().toISOString(),
    p_max_attempts: options?.maxAttempts ?? 3,
  });

  if (error) {
    console.error('Enqueue job error:', error);
    return null;
  }

  return data as string;
}

/**
 * Complete a job successfully
 */
export async function completeJob(
  jobId: string,
  result?: Record<string, unknown>
): Promise<boolean> {
  const client = getAdminClient();
  
  const { data, error } = await client.rpc('complete_job', {
    p_job_id: jobId,
    p_result: result ?? null,
  });

  if (error) {
    console.error('Complete job error:', error);
    return false;
  }

  return data as boolean;
}

/**
 * Fail a job
 */
export async function failJob(
  jobId: string,
  errorMessage: string,
  retry: boolean = true
): Promise<boolean> {
  const client = getAdminClient();
  
  const { data, error } = await client.rpc('fail_job', {
    p_job_id: jobId,
    p_error: errorMessage,
    p_retry: retry,
  });

  if (error) {
    console.error('Fail job error:', error);
    return false;
  }

  return data as boolean;
}

/**
 * Cleanup stale jobs
 */
export async function cleanupStaleJobs(
  staleThresholdMinutes: number = 30
): Promise<number> {
  const client = getAdminClient();
  
  const { data, error } = await client.rpc('cleanup_stale_jobs', {
    p_stale_threshold: `${staleThresholdMinutes} minutes`,
  });

  if (error) {
    console.error('Cleanup stale jobs error:', error);
    return 0;
  }

  return data as number;
}

/**
 * Schedule repository refresh jobs
 */
export async function scheduleRepoRefreshJobs(
  repositoryIds: string[],
  priority: number = 3
): Promise<number> {
  let scheduled = 0;

  for (const repositoryId of repositoryIds) {
    const jobId = await enqueueJob('repo.refresh', { repositoryId }, { priority });
    if (jobId) scheduled++;
  }

  return scheduled;
}

/**
 * Schedule daily snapshot jobs for all repositories
 */
export async function scheduleDailySnapshotJobs(): Promise<number> {
  const client = getAdminClient();
  
  // Get all repository IDs
  const { data: repos } = await client
    .from('repositories')
    .select('id')
    .eq('is_archived', false);

  if (!repos) return 0;

  let scheduled = 0;
  for (const repo of repos) {
    const jobId = await enqueueJob(
      'repo.daily_snapshot',
      { repositoryId: repo.id },
      { priority: 4 } // Lower priority for batch jobs
    );
    if (jobId) scheduled++;
  }

  return scheduled;
}

/**
 * Schedule ranking computation job
 */
export async function scheduleRankingJob(
  period: 'daily' | 'weekly' | 'monthly',
  asOf?: Date
): Promise<string | null> {
  return enqueueJob(
    'rankings.compute',
    {
      period,
      asOf: (asOf ?? new Date()).toISOString().split('T')[0]!,
    },
    { priority: 2 } // Higher priority for rankings
  );
}
