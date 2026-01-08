/**
 * ============================================================================
 * DISCOVER: Core Module Exports
 * Description: Public API for the core domain layer
 * ============================================================================
 */

// Types
export * from './types';

// Scoring
export { computeHealthScore, SCORING_ALGORITHM_VERSION } from './scoring';

// Ranking
export { 
  computeRanking, 
  groupByLanguage, 
  mergeRankings, 
  calculatePercentile 
} from './ranking';

// Alternatives
export { 
  rankAlternatives,
  type RankedAlternative,
  type AlternativesInput,
} from './alternatives';
