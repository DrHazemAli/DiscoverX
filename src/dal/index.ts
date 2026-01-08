/**
 * ============================================================================
 * DISCOVER: DAL Module Exports
 * Description: Public API for the data access layer
 * ============================================================================
 */

// Database client
export { getAdminClient, createAdminClient } from './db';
export type * from './db';

// Repositories
export * from './repos.repo';

// Snapshots
export * from './snapshots.repo';

// Scores
export * from './scores.repo';

// Rankings
export * from './rankings.repo';

// Jobs
export * from './jobs.repo';
