/**
 * ============================================================================
 * DISCOVER: Application Use Cases Export
 * Description: Public API for application use cases
 * ============================================================================
 */

// Search
export { searchRepositories, getAvailableLanguages } from './usecases/search';

// Repository
export { getRepositoryProfile, getRepositoryById, getRepositoriesByIds } from './usecases/repository';

// Timeseries
export { getTimeseries, getAvailableMetrics } from './usecases/timeseries';

// Rankings
export { getRankings, getRankedLanguages, getRepositoryRanking } from './usecases/rankings';

// Alternatives
export { getAlternatives } from './usecases/alternatives';

// Compare
export { compareRepositories, getComparisonMetrics } from './usecases/compare';
