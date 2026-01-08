/**
 * ============================================================================
 * DISCOVER: Job Handlers
 * Description: Background job processing handlers
 * ============================================================================
 */

import 'server-only';
import type { Job, JobType } from '@/core/types';
import { computeHealthScore } from '@/core/scoring';
import { computeRanking } from '@/core/ranking';
import * as repos from '@/dal/repos.repo';
import * as snapshots from '@/dal/snapshots.repo';
import * as scores from '@/dal/scores.repo';
import * as rankings from '@/dal/rankings.repo';
import * as jobs from '@/dal/jobs.repo';
import { getGitHubClient, mapGitHubRepository, GitHubNotFoundError } from '@/server/github';
import { logger } from '@/lib/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Job handler result
 */
export interface JobHandlerResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

/**
 * Job handler function type
 */
type JobHandler = (job: Job) => Promise<JobHandlerResult>;

// ============================================================================
// HANDLER REGISTRY
// ============================================================================

const handlers: Record<JobType, JobHandler> = {
  'repo.refresh': handleRepoRefresh,
  'repo.daily_snapshot': handleDailySnapshot,
  'repo.signals': handleRepoSignals,
  'repo.score': handleRepoScore,
  'rankings.compute': handleRankingsCompute,
};

// ============================================================================
// MAIN JOB PROCESSOR
// ============================================================================

/**
 * Process a single job
 */
export async function processJob(job: Job): Promise<JobHandlerResult> {
  const handler = handlers[job.type];
  
  if (!handler) {
    logger.error('Unknown job type', { type: job.type, jobId: job.id });
    return { success: false, message: `Unknown job type: ${job.type}` };
  }
  
  logger.info('Processing job', { type: job.type, jobId: job.id, attempt: job.attempt });
  
  const startTime = Date.now();
  
  try {
    const result = await handler(job);
    
    const duration = Date.now() - startTime;
    logger.info('Job completed', { 
      type: job.type, 
      jobId: job.id, 
      duration,
      success: result.success,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Job failed', {
      type: job.type,
      jobId: job.id,
      duration,
      error: error instanceof Error ? error.message : String(error),
    });
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process a batch of jobs
 */
export async function processBatch(
  batchSize: number = 10,
  jobTypes?: JobType[]
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{ jobId: string; type: string; success: boolean; duration: number; error?: string }>;
}> {
  // Clean up stale jobs first
  await jobs.cleanupStaleJobs(30);
  
  // Dequeue jobs
  const workerId = `worker-${Date.now()}`;
  const dequeuedJobs = await jobs.dequeueJobs(batchSize, workerId, jobTypes);
  
  if (dequeuedJobs.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, results: [] };
  }
  
  logger.info('Dequeued jobs for processing', { count: dequeuedJobs.length, workerId });
  
  const results: Array<{ jobId: string; type: string; success: boolean; duration: number; error?: string }> = [];
  let succeeded = 0;
  let failed = 0;
  
  // Process each job
  for (const job of dequeuedJobs) {
    const startTime = Date.now();
    const result = await processJob(job);
    const duration = Date.now() - startTime;
    
    if (result.success) {
      await jobs.completeJob(job.id, result.data);
      succeeded++;
    } else {
      await jobs.failJob(job.id, result.message ?? 'Unknown error');
      failed++;
    }
    
    results.push({
      jobId: job.id,
      type: job.type,
      success: result.success,
      duration,
      error: result.success ? undefined : result.message,
    });
  }
  
  return {
    processed: dequeuedJobs.length,
    succeeded,
    failed,
    results,
  };
}

// ============================================================================
// JOB HANDLERS
// ============================================================================

/**
 * Handle repository refresh job
 * Fetches latest data from GitHub and updates the database
 */
async function handleRepoRefresh(job: Job): Promise<JobHandlerResult> {
  const { repositoryId } = job.payload as { repositoryId: string };
  
  // Get existing repository
  const repo = await repos.getRepositoryById(repositoryId);
  if (!repo) {
    return { success: false, message: 'Repository not found' };
  }
  
  const github = getGitHubClient();
  
  try {
    // Fetch from GitHub
    const ghRepo = await github.getRepository(repo.owner, repo.name);
    const mapped = mapGitHubRepository(ghRepo);
    
    // Update repository
    await repos.upsertRepository(mapped);
    
    // Schedule follow-up jobs
    await jobs.enqueueJob('repo.daily_snapshot', { repositoryId }, { priority: 4 });
    await jobs.enqueueJob('repo.score', { repositoryId }, { priority: 4 });
    
    return { 
      success: true, 
      data: { 
        stars: ghRepo.stargazers_count,
        forks: ghRepo.forks_count,
      },
    };
  } catch (error) {
    if (error instanceof GitHubNotFoundError) {
      return { success: false, message: 'Repository not found on GitHub' };
    }
    throw error;
  }
}

/**
 * Handle daily snapshot job
 * Creates a snapshot of current repository metrics
 */
async function handleDailySnapshot(job: Job): Promise<JobHandlerResult> {
  const { repositoryId } = job.payload as { repositoryId: string };
  
  const repo = await repos.getRepositoryById(repositoryId);
  if (!repo) {
    return { success: false, message: 'Repository not found' };
  }
  
  // Check if snapshot already exists for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const exists = await snapshots.snapshotExistsForDate(repositoryId, today);
  if (exists) {
    return { success: true, message: 'Snapshot already exists for today' };
  }
  
  const github = getGitHubClient();
  
  // Get additional metrics from GitHub
  let activity = { issuesOpened: 0, issuesClosed: 0, prsOpened: 0, prsMerged: 0 };
  let contributorCount = 0;
  let commitActivity: { week: number; total: number }[] = [];
  
  try {
    [activity, contributorCount, commitActivity] = await Promise.all([
      github.getRecentActivity(repo.owner, repo.name),
      github.getContributorCount(repo.owner, repo.name),
      github.getCommitActivity(repo.owner, repo.name),
    ]);
  } catch (error) {
    logger.warn('Failed to fetch GitHub metrics', { repositoryId, error });
  }
  
  // Calculate commits in last 30 days from commit activity
  const recentWeeks = commitActivity.slice(-5); // ~35 days
  const commitsLast30d = recentWeeks.reduce((sum, week) => sum + week.total, 0);
  
  // Create snapshot
  const snapshot = await snapshots.createSnapshot({
    repositoryId,
    snapshotDate: today,
    starsCount: repo.starsCount,
    forksCount: repo.forksCount,
    watchersCount: repo.watchersCount,
    openIssuesCount: repo.openIssuesCount,
    commitsCount: commitActivity.reduce((sum, week) => sum + week.total, 0),
    contributorsCount: contributorCount,
    releasesCount: 0, // TODO: Get from signals
    commitsLast30d,
    prsOpenedLast30d: activity.prsOpened,
    prsMergedLast30d: activity.prsMerged,
    issuesOpenedLast30d: activity.issuesOpened,
    issuesClosedLast30d: activity.issuesClosed,
  });
  
  if (!snapshot) {
    return { success: false, message: 'Failed to create snapshot' };
  }
  
  return { 
    success: true, 
    data: { snapshotId: snapshot.id },
  };
}

/**
 * Handle repository signals job
 * Fetches releases and other signals from GitHub
 */
async function handleRepoSignals(job: Job): Promise<JobHandlerResult> {
  const { repositoryId } = job.payload as { repositoryId: string };
  
  const repo = await repos.getRepositoryById(repositoryId);
  if (!repo) {
    return { success: false, message: 'Repository not found' };
  }
  
  const github = getGitHubClient();
  
  try {
    // Fetch releases
    const releases = await github.getReleases(repo.owner, repo.name, 20);
    
    // TODO: Store signals in database
    logger.info('Fetched signals', { repositoryId, releases: releases.length });
    
    return { 
      success: true, 
      data: { releasesCount: releases.length },
    };
  } catch (error) {
    if (error instanceof GitHubNotFoundError) {
      return { success: false, message: 'Repository not found on GitHub' };
    }
    throw error;
  }
}

/**
 * Handle repository score computation job
 */
async function handleRepoScore(job: Job): Promise<JobHandlerResult> {
  const { repositoryId } = job.payload as { repositoryId: string };
  
  const repo = await repos.getRepositoryById(repositoryId);
  if (!repo) {
    return { success: false, message: 'Repository not found' };
  }
  
  // Get latest snapshot
  const snapshot = await snapshots.getLatestSnapshot(repositoryId);
  if (!snapshot) {
    return { success: false, message: 'No snapshot available for scoring' };
  }
  
  // Get recent snapshots for trend analysis
  const recentSnapshots = await snapshots.getRecentSnapshots(repositoryId, 90);
  
  // TODO: Get signals from database
  const signals: never[] = [];
  
  // Compute score
  const scoreResult = computeHealthScore({
    repository: repo,
    snapshot,
    recentSnapshots,
    signals,
  });
  
  // Save score
  const savedScore = await scores.saveScore(repositoryId, {
    overallScore: scoreResult.overallScore,
    activityScore: scoreResult.dimensionScores.activity,
    communityScore: scoreResult.dimensionScores.community,
    maintenanceScore: scoreResult.dimensionScores.maintenance,
    popularityScore: scoreResult.dimensionScores.popularity,
    qualityScore: scoreResult.dimensionScores.quality,
    scoreBreakdown: scoreResult.breakdown,
    algorithmVersion: scoreResult.algorithmVersion,
  });
  
  if (!savedScore) {
    return { success: false, message: 'Failed to save score' };
  }
  
  return { 
    success: true, 
    data: { 
      scoreId: savedScore.id,
      overallScore: scoreResult.overallScore,
    },
  };
}

/**
 * Handle rankings computation job
 */
async function handleRankingsCompute(job: Job): Promise<JobHandlerResult> {
  const payload = job.payload as {
    period: 'daily' | 'weekly' | 'monthly';
    asOf: string;
    rankingType?: string;
    language?: string;
  };
  
  const { period, asOf, rankingType, language } = payload;
  const asOfDate = new Date(asOf);
  
  // Get all latest scores
  const allScores = await scores.getAllLatestScores();
  
  if (allScores.length === 0) {
    return { success: false, message: 'No scores available for ranking' };
  }
  
  // Get previous rankings for rank change calculation
  const previousRankings = await rankings.getPreviousRankings(
    period,
    (rankingType as 'overall') ?? 'overall',
    asOfDate,
    language ?? null
  );
  
  // Prepare scores for ranking computation
  const scoresForRanking = allScores.map(s => ({
    repositoryId: s.repositoryId,
    score: s.overallScore,
    breakdown: s.scoreBreakdown,
  }));
  
  // Compute rankings
  const rankingResult = computeRanking(
    {
      period,
      asOf: asOfDate,
      rankingType: (rankingType as 'overall') ?? 'overall',
      language,
      scores: scoresForRanking,
    },
    previousRankings
  );
  
  // Save rankings
  const savedCount = await rankings.saveRankings(
    rankingResult.rankings.map(r => ({
      period,
      asOf: asOfDate,
      rankingType: rankingResult.rankingType,
      language: rankingResult.language,
      repositoryId: r.repositoryId,
      rank: r.rank,
      score: r.score,
      rankChange: r.rankChange,
      rankingExplanation: r.explanation,
    }))
  );
  
  return { 
    success: true, 
    data: { 
      savedCount,
      period,
      rankingType: rankingResult.rankingType,
    },
  };
}
