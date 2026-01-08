/**
 * ============================================================================
 * DISCOVER: Ranking Algorithm
 * Description: Pure functions for computing repository rankings
 * ============================================================================
 */

import type {
  RankingInput,
  RankingResult,
  RankingExplanation,
  ScoreBreakdown,
} from '../types';

// ============================================================================
// MAIN RANKING FUNCTION
// ============================================================================

/**
 * Compute rankings from a set of scores
 * 
 * @param input - Ranking computation input
 * @param previousRankings - Optional previous rankings for calculating rank changes
 * @returns Computed rankings with positions and explanations
 */
export function computeRanking(
  input: RankingInput,
  previousRankings?: Map<string, number>
): RankingResult {
  const { period, asOf, rankingType, language, scores } = input;

  // Sort scores by the appropriate metric
  const sortedScores = sortByRankingType(scores, rankingType);

  // Generate rankings with positions
  const rankings = sortedScores.map((item, index) => {
    const rank = index + 1;
    const previousRank = previousRankings?.get(item.repositoryId);
    const rankChange = previousRank ? previousRank - rank : 0;

    return {
      repositoryId: item.repositoryId,
      rank,
      score: item.score,
      rankChange,
      explanation: generateExplanation(item.breakdown, rankingType, sortedScores),
    };
  });

  return {
    period,
    asOf,
    rankingType,
    language: language ?? null,
    rankings,
  };
}

// ============================================================================
// SORTING FUNCTIONS
// ============================================================================

/**
 * Sort scores based on the ranking type
 */
function sortByRankingType(
  scores: RankingInput['scores'],
  rankingType: RankingInput['rankingType']
): RankingInput['scores'] {
  return [...scores].sort((a, b) => {
    const scoreA = getRelevantScore(a.score, a.breakdown, rankingType);
    const scoreB = getRelevantScore(b.score, b.breakdown, rankingType);
    return scoreB - scoreA; // Descending order
  });
}

/**
 * Get the relevant score for a ranking type
 */
function getRelevantScore(
  overallScore: number,
  breakdown: ScoreBreakdown,
  rankingType: RankingInput['rankingType']
): number {
  switch (rankingType) {
    case 'overall':
      return overallScore;
    case 'activity':
      return breakdown.activity.normalizedScore;
    case 'community':
      return breakdown.community.normalizedScore;
    case 'maintenance':
      return breakdown.maintenance.normalizedScore;
    case 'popularity':
      return breakdown.popularity.normalizedScore;
    case 'quality':
      return breakdown.quality.normalizedScore;
    default:
      return overallScore;
  }
}

// ============================================================================
// EXPLANATION GENERATION
// ============================================================================

/**
 * Generate explanation for a ranking position
 */
function generateExplanation(
  breakdown: ScoreBreakdown,
  rankingType: RankingInput['rankingType'],
  allScores: RankingInput['scores']
): RankingExplanation {
  // Find top factors for this repository
  const topFactors = findTopFactors(breakdown, rankingType);

  // Calculate comparison to average
  const comparedToAverage = calculateAverageComparison(breakdown, allScores);

  return {
    topFactors,
    comparedToAverage,
  };
}

/**
 * Find the top contributing factors for a score
 */
function findTopFactors(
  breakdown: ScoreBreakdown,
  rankingType: RankingInput['rankingType']
): string[] {
  const allFactors: Array<{ name: string; contribution: number }> = [];

  // Collect factors from the relevant dimension(s)
  const dimensions = rankingType === 'overall'
    ? Object.keys(breakdown) as Array<keyof ScoreBreakdown>
    : [rankingType as keyof ScoreBreakdown];

  dimensions.forEach(dimension => {
    const dimensionData = breakdown[dimension];
    if (dimensionData) {
      dimensionData.factors.forEach(factor => {
        allFactors.push({
          name: `${dimension}: ${factor.name}`,
          contribution: factor.contribution,
        });
      });
    }
  });

  // Sort by contribution and take top 3
  return allFactors
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map(f => f.name);
}

/**
 * Calculate how this repository compares to the average
 */
function calculateAverageComparison(
  breakdown: ScoreBreakdown,
  allScores: RankingInput['scores']
): Record<string, number> {
  // Calculate averages for each dimension
  const dimensions = ['activity', 'community', 'maintenance', 'popularity', 'quality'] as const;
  const averages: Record<string, number> = {};

  dimensions.forEach(dimension => {
    const sum = allScores.reduce(
      (total, s) => total + s.breakdown[dimension].normalizedScore,
      0
    );
    averages[dimension] = sum / allScores.length;
  });

  // Calculate comparison percentages
  const comparison: Record<string, number> = {};
  
  dimensions.forEach(dimension => {
    const myScore = breakdown[dimension].normalizedScore;
    const avg = averages[dimension];
    if (avg && avg > 0) {
      comparison[dimension] = Math.round(((myScore - avg) / avg) * 100);
    } else {
      comparison[dimension] = 0;
    }
  });

  return comparison;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Group rankings by language for multi-language computations
 */
export function groupByLanguage(
  scores: Array<{ repositoryId: string; language: string | null; score: number; breakdown: ScoreBreakdown }>
): Map<string | null, RankingInput['scores']> {
  const groups = new Map<string | null, RankingInput['scores']>();

  scores.forEach(score => {
    const lang = score.language;
    if (!groups.has(lang)) {
      groups.set(lang, []);
    }
    groups.get(lang)!.push({
      repositoryId: score.repositoryId,
      score: score.score,
      breakdown: score.breakdown,
    });
  });

  return groups;
}

/**
 * Merge multiple ranking results into one
 */
export function mergeRankings(results: RankingResult[]): RankingResult | null {
  if (results.length === 0) return null;
  
  const first = results[0]!;
  
  return {
    period: first.period,
    asOf: first.asOf,
    rankingType: first.rankingType,
    language: null, // Merged rankings don't have a specific language
    rankings: results.flatMap(r => r.rankings),
  };
}

/**
 * Calculate the percentile rank for a given position
 */
export function calculatePercentile(rank: number, total: number): number {
  if (total === 0) return 0;
  return Math.round(((total - rank) / total) * 100);
}
