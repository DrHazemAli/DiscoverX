/**
 * ============================================================================
 * DISCOVER: Scoring Algorithm
 * Description: Pure functions for computing repository health scores
 * ============================================================================
 */

import type {
  ScoreInput,
  ScoreResult,
  ScoreBreakdown,
  ScoreFactors,
  ScoreFactor,
  ScoreDimension,
  RepositorySnapshot,
} from '../types';

// Current algorithm version
export const SCORING_ALGORITHM_VERSION = '1.0.0';

// ============================================================================
// SCORE WEIGHTS
// These determine how much each dimension contributes to the overall score
// ============================================================================
const DIMENSION_WEIGHTS: Record<ScoreDimension, number> = {
  activity: 0.25,      // 25% - How active is development?
  community: 0.20,     // 20% - How engaged is the community?
  maintenance: 0.20,   // 20% - How well maintained?
  popularity: 0.15,    // 15% - How popular?
  quality: 0.20,       // 20% - Code quality signals
};

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Compute the health score for a repository
 * 
 * @param input - Score computation input data
 * @returns Complete score result with breakdown
 */
export function computeHealthScore(input: ScoreInput): ScoreResult {
  // Calculate each dimension score
  const activityFactors = calculateActivityScore(input);
  const communityFactors = calculateCommunityScore(input);
  const maintenanceFactors = calculateMaintenanceScore(input);
  const popularityFactors = calculatePopularityScore(input);
  const qualityFactors = calculateQualityScore(input);

  // Build the breakdown
  const breakdown: ScoreBreakdown = {
    activity: activityFactors,
    community: communityFactors,
    maintenance: maintenanceFactors,
    popularity: popularityFactors,
    quality: qualityFactors,
  };

  // Calculate dimension scores
  const dimensionScores: Record<ScoreDimension, number> = {
    activity: activityFactors.normalizedScore,
    community: communityFactors.normalizedScore,
    maintenance: maintenanceFactors.normalizedScore,
    popularity: popularityFactors.normalizedScore,
    quality: qualityFactors.normalizedScore,
  };

  // Calculate weighted overall score
  const overallScore = Object.entries(dimensionScores).reduce(
    (total, [dimension, score]) => {
      return total + score * DIMENSION_WEIGHTS[dimension as ScoreDimension];
    },
    0
  );

  return {
    overallScore: roundScore(overallScore),
    dimensionScores,
    breakdown,
    algorithmVersion: SCORING_ALGORITHM_VERSION,
  };
}

// ============================================================================
// DIMENSION SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate activity score based on development activity
 * Factors: commits, PRs, recent activity velocity
 */
function calculateActivityScore(input: ScoreInput): ScoreFactors {
  const { snapshot, recentSnapshots } = input;
  const factors: ScoreFactor[] = [];

  // Factor 1: Commits in last 30 days
  const commitsScore = normalizeWithLog(snapshot.commitsLast30d, 100);
  factors.push({
    name: 'Recent Commits',
    value: snapshot.commitsLast30d,
    weight: 0.35,
    contribution: commitsScore * 0.35,
    description: `${snapshot.commitsLast30d} commits in last 30 days`,
  });

  // Factor 2: PR activity
  const prActivity = snapshot.prsOpenedLast30d + snapshot.prsMergedLast30d;
  const prScore = normalizeWithLog(prActivity, 50);
  factors.push({
    name: 'PR Activity',
    value: prActivity,
    weight: 0.30,
    contribution: prScore * 0.30,
    description: `${prActivity} PRs opened/merged in last 30 days`,
  });

  // Factor 3: Activity trend (comparing recent snapshots)
  const trendScore = calculateActivityTrend(recentSnapshots);
  factors.push({
    name: 'Activity Trend',
    value: trendScore,
    weight: 0.20,
    contribution: trendScore * 0.20,
    description: trendScore > 50 ? 'Activity is increasing' : 'Activity is stable or declining',
  });

  // Factor 4: Days since last push
  const daysSinceUpdate = input.repository.githubPushedAt
    ? daysBetween(input.repository.githubPushedAt, new Date())
    : 365;
  const freshnessScore = Math.max(0, 100 - daysSinceUpdate * 2);
  factors.push({
    name: 'Freshness',
    value: daysSinceUpdate,
    weight: 0.15,
    contribution: freshnessScore * 0.15,
    description: `Last push ${daysSinceUpdate} days ago`,
  });

  const rawScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  
  return {
    factors,
    weight: DIMENSION_WEIGHTS.activity,
    rawScore,
    normalizedScore: roundScore(rawScore),
  };
}

/**
 * Calculate community score based on community engagement
 * Factors: contributors, stars growth, discussions
 */
function calculateCommunityScore(input: ScoreInput): ScoreFactors {
  const { repository, snapshot, recentSnapshots } = input;
  const factors: ScoreFactor[] = [];

  // Factor 1: Number of contributors
  const contributorsScore = normalizeWithLog(snapshot.contributorsCount, 200);
  factors.push({
    name: 'Contributors',
    value: snapshot.contributorsCount,
    weight: 0.35,
    contribution: contributorsScore * 0.35,
    description: `${snapshot.contributorsCount} contributors`,
  });

  // Factor 2: Stars growth rate
  const starsGrowth = calculateGrowthRate(recentSnapshots, 'starsCount');
  const growthScore = normalizeGrowthRate(starsGrowth);
  factors.push({
    name: 'Stars Growth',
    value: starsGrowth,
    weight: 0.25,
    contribution: growthScore * 0.25,
    description: `${starsGrowth.toFixed(1)}% growth in stars`,
  });

  // Factor 3: Discussions enabled and active
  const discussionsScore = repository.hasDiscussions ? 70 : 30;
  factors.push({
    name: 'Discussions',
    value: repository.hasDiscussions ? 1 : 0,
    weight: 0.15,
    contribution: discussionsScore * 0.15,
    description: repository.hasDiscussions ? 'Discussions enabled' : 'No discussions',
  });

  // Factor 4: Issue engagement
  const issueActivity = snapshot.issuesOpenedLast30d + snapshot.issuesClosedLast30d;
  const issueScore = normalizeWithLog(issueActivity, 100);
  factors.push({
    name: 'Issue Engagement',
    value: issueActivity,
    weight: 0.25,
    contribution: issueScore * 0.25,
    description: `${issueActivity} issues opened/closed in last 30 days`,
  });

  const rawScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  
  return {
    factors,
    weight: DIMENSION_WEIGHTS.community,
    rawScore,
    normalizedScore: roundScore(rawScore),
  };
}

/**
 * Calculate maintenance score based on how well the project is maintained
 * Factors: issue resolution, release frequency, open issues ratio
 */
function calculateMaintenanceScore(input: ScoreInput): ScoreFactors {
  const { repository, snapshot, signals } = input;
  const factors: ScoreFactor[] = [];

  // Factor 1: Issue resolution ratio
  const totalIssueActivity = snapshot.issuesOpenedLast30d + snapshot.issuesClosedLast30d;
  const resolutionRatio = totalIssueActivity > 0
    ? (snapshot.issuesClosedLast30d / totalIssueActivity) * 100
    : 50; // Neutral if no activity
  factors.push({
    name: 'Issue Resolution',
    value: resolutionRatio,
    weight: 0.30,
    contribution: resolutionRatio * 0.30,
    description: `${resolutionRatio.toFixed(0)}% of issues closed`,
  });

  // Factor 2: Release frequency (from signals)
  const recentReleases = signals.filter(
    (s): s is typeof s => s.signalType === 'release' &&
    daysBetween(s.occurredAt, new Date()) <= 90
  ).length;
  const releaseScore = normalizeWithLog(recentReleases, 10);
  factors.push({
    name: 'Release Frequency',
    value: recentReleases,
    weight: 0.30,
    contribution: releaseScore * 0.30,
    description: `${recentReleases} releases in last 90 days`,
  });

  // Factor 3: Open issues ratio (lower is better)
  const openIssuesRatio = repository.starsCount > 0
    ? (repository.openIssuesCount / repository.starsCount) * 100
    : 0;
  const openIssuesScore = Math.max(0, 100 - openIssuesRatio * 10);
  factors.push({
    name: 'Open Issues Ratio',
    value: openIssuesRatio,
    weight: 0.20,
    contribution: openIssuesScore * 0.20,
    description: `${openIssuesRatio.toFixed(2)}% open issues to stars ratio`,
  });

  // Factor 4: Not archived
  const archivedScore = repository.isArchived ? 0 : 100;
  factors.push({
    name: 'Active Project',
    value: repository.isArchived ? 0 : 1,
    weight: 0.20,
    contribution: archivedScore * 0.20,
    description: repository.isArchived ? 'Project is archived' : 'Project is active',
  });

  const rawScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  
  return {
    factors,
    weight: DIMENSION_WEIGHTS.maintenance,
    rawScore,
    normalizedScore: roundScore(rawScore),
  };
}

/**
 * Calculate popularity score based on popularity metrics
 * Factors: stars, forks, watchers
 */
function calculatePopularityScore(input: ScoreInput): ScoreFactors {
  const { repository } = input;
  const factors: ScoreFactor[] = [];

  // Factor 1: Stars (logarithmic scale for fair comparison)
  const starsScore = normalizeWithLog(repository.starsCount, 50000);
  factors.push({
    name: 'Stars',
    value: repository.starsCount,
    weight: 0.50,
    contribution: starsScore * 0.50,
    description: `${formatNumber(repository.starsCount)} stars`,
  });

  // Factor 2: Forks
  const forksScore = normalizeWithLog(repository.forksCount, 10000);
  factors.push({
    name: 'Forks',
    value: repository.forksCount,
    weight: 0.30,
    contribution: forksScore * 0.30,
    description: `${formatNumber(repository.forksCount)} forks`,
  });

  // Factor 3: Watchers
  const watchersScore = normalizeWithLog(repository.watchersCount, 5000);
  factors.push({
    name: 'Watchers',
    value: repository.watchersCount,
    weight: 0.20,
    contribution: watchersScore * 0.20,
    description: `${formatNumber(repository.watchersCount)} watchers`,
  });

  const rawScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  
  return {
    factors,
    weight: DIMENSION_WEIGHTS.popularity,
    rawScore,
    normalizedScore: roundScore(rawScore),
  };
}

/**
 * Calculate quality score based on code quality signals
 * Factors: has README, license, topics, documentation
 */
function calculateQualityScore(input: ScoreInput): ScoreFactors {
  const { repository } = input;
  const factors: ScoreFactor[] = [];

  // Factor 1: Has license
  const licenseScore = repository.licenseKey ? 100 : 20;
  factors.push({
    name: 'License',
    value: repository.licenseKey ? 1 : 0,
    weight: 0.25,
    contribution: licenseScore * 0.25,
    description: repository.licenseKey
      ? `Licensed under ${repository.licenseName}`
      : 'No license specified',
  });

  // Factor 2: Has description
  const descriptionScore = repository.description && repository.description.length > 20
    ? 100
    : repository.description
    ? 50
    : 10;
  factors.push({
    name: 'Description',
    value: repository.description?.length ?? 0,
    weight: 0.20,
    contribution: descriptionScore * 0.20,
    description: repository.description ? 'Has description' : 'No description',
  });

  // Factor 3: Topics/tags
  const topicsCount = repository.topics.length;
  const topicsScore = Math.min(100, topicsCount * 20);
  factors.push({
    name: 'Topics',
    value: topicsCount,
    weight: 0.20,
    contribution: topicsScore * 0.20,
    description: `${topicsCount} topics defined`,
  });

  // Factor 4: Has homepage/documentation
  const homepageScore = repository.homepageUrl ? 100 : 30;
  factors.push({
    name: 'Documentation',
    value: repository.homepageUrl ? 1 : 0,
    weight: 0.20,
    contribution: homepageScore * 0.20,
    description: repository.homepageUrl ? 'Has documentation link' : 'No documentation link',
  });

  // Factor 5: Has wiki
  const wikiScore = repository.hasWiki ? 80 : 40;
  factors.push({
    name: 'Wiki',
    value: repository.hasWiki ? 1 : 0,
    weight: 0.15,
    contribution: wikiScore * 0.15,
    description: repository.hasWiki ? 'Wiki enabled' : 'No wiki',
  });

  const rawScore = factors.reduce((sum, f) => sum + f.contribution, 0);
  
  return {
    factors,
    weight: DIMENSION_WEIGHTS.quality,
    rawScore,
    normalizedScore: roundScore(rawScore),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize a value using logarithmic scale
 * This helps compare repositories of vastly different sizes fairly
 * 
 * @param value - The raw value to normalize
 * @param maxExpected - Expected maximum value for 100 score
 * @returns Normalized score between 0 and 100
 */
function normalizeWithLog(value: number, maxExpected: number): number {
  if (value <= 0) return 0;
  if (value >= maxExpected) return 100;
  
  // Use log scale for more even distribution
  const logValue = Math.log10(value + 1);
  const logMax = Math.log10(maxExpected + 1);
  
  return Math.min(100, (logValue / logMax) * 100);
}

/**
 * Calculate activity trend from recent snapshots
 * Returns a score from 0-100 where >50 means increasing activity
 */
function calculateActivityTrend(snapshots: RepositorySnapshot[]): number {
  if (snapshots.length < 2) return 50; // Neutral if insufficient data

  // Sort by date descending
  const sorted = [...snapshots].sort(
    (a, b) => b.snapshotDate.getTime() - a.snapshotDate.getTime()
  );

  // Compare recent half to older half
  const midpoint = Math.floor(sorted.length / 2);
  const recentHalf = sorted.slice(0, midpoint);
  const olderHalf = sorted.slice(midpoint);

  const recentActivity = averageActivity(recentHalf);
  const olderActivity = averageActivity(olderHalf);

  if (olderActivity === 0) return recentActivity > 0 ? 75 : 50;

  const changeRatio = recentActivity / olderActivity;
  
  // Convert ratio to 0-100 scale where 1.0 = 50
  return Math.min(100, Math.max(0, changeRatio * 50));
}

/**
 * Calculate average activity from snapshots
 */
function averageActivity(snapshots: RepositorySnapshot[]): number {
  if (snapshots.length === 0) return 0;
  
  const total = snapshots.reduce(
    (sum, s) => sum + s.commitsLast30d + s.prsOpenedLast30d + s.prsMergedLast30d,
    0
  );
  
  return total / snapshots.length;
}

/**
 * Calculate growth rate for a metric across snapshots
 */
function calculateGrowthRate(
  snapshots: RepositorySnapshot[],
  metric: keyof RepositorySnapshot
): number {
  if (snapshots.length < 2) return 0;

  const sorted = [...snapshots].sort(
    (a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime()
  );

  const oldest = sorted[0]![metric] as number;
  const newest = sorted[sorted.length - 1]![metric] as number;

  if (oldest === 0) return newest > 0 ? 100 : 0;

  return ((newest - oldest) / oldest) * 100;
}

/**
 * Normalize growth rate to 0-100 scale
 */
function normalizeGrowthRate(rate: number): number {
  // Map -50% to +100% growth to 0-100 scale
  const normalized = ((rate + 50) / 150) * 100;
  return Math.min(100, Math.max(0, normalized));
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const diffMs = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Round score to 2 decimal places
 */
function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}

/**
 * Format large numbers for display
 */
function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
