/**
 * ============================================================================
 * DISCOVER: Alternatives Finder
 * Description: Pure functions for finding and ranking similar repositories
 * ============================================================================
 */

import type {
  Repository,
  RepositorySummary,
  RepositoryScore,
} from '../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Alternative repository with similarity score
 */
export interface RankedAlternative {
  repository: RepositorySummary;
  score: RepositoryScore | null;
  similarityScore: number;
  matchReasons: string[];
}

/**
 * Input for finding alternatives
 */
export interface AlternativesInput {
  seedRepository: Repository;
  seedScore: RepositoryScore | null;
  candidates: Array<{
    repository: Repository;
    score: RepositoryScore | null;
  }>;
  maxResults?: number;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Find and rank alternative repositories similar to the seed repository
 * 
 * @param input - Alternatives finding input
 * @returns Ranked list of alternative repositories
 */
export function rankAlternatives(input: AlternativesInput): RankedAlternative[] {
  const { seedRepository, seedScore, candidates, maxResults = 10 } = input;

  // Calculate similarity for each candidate
  const rankedCandidates = candidates
    .filter(c => c.repository.id !== seedRepository.id) // Exclude seed itself
    .map(candidate => {
      const similarity = calculateSimilarity(seedRepository, candidate.repository);
      const matchReasons = getMatchReasons(seedRepository, candidate.repository);

      return {
        repository: toSummary(candidate.repository),
        score: candidate.score,
        similarityScore: similarity,
        matchReasons,
      };
    })
    // Sort by similarity (highest first)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    // Limit results
    .slice(0, maxResults);

  // Apply quality boost - if candidate has better score, boost similarity slightly
  return rankedCandidates.map(alt => {
    if (alt.score && seedScore && alt.score.overallScore > seedScore.overallScore) {
      return {
        ...alt,
        similarityScore: Math.min(100, alt.similarityScore * 1.1), // 10% boost
      };
    }
    return alt;
  });
}

// ============================================================================
// SIMILARITY CALCULATION
// ============================================================================

/**
 * Calculate similarity score between two repositories (0-100)
 */
function calculateSimilarity(seed: Repository, candidate: Repository): number {
  let totalScore = 0;
  let totalWeight = 0;

  // Factor 1: Same primary language (weight: 25)
  const languageSimilarity = calculateLanguageSimilarity(seed.language, candidate.language);
  totalScore += languageSimilarity * 25;
  totalWeight += 25;

  // Factor 2: Topic overlap (weight: 30)
  const topicSimilarity = calculateTopicOverlap(seed.topics, candidate.topics);
  totalScore += topicSimilarity * 30;
  totalWeight += 30;

  // Factor 3: Size similarity - stars in same order of magnitude (weight: 15)
  const sizeSimilarity = calculateSizeSimilarity(seed.starsCount, candidate.starsCount);
  totalScore += sizeSimilarity * 15;
  totalWeight += 15;

  // Factor 4: Description similarity using keyword matching (weight: 20)
  const descriptionSimilarity = calculateDescriptionSimilarity(
    seed.description,
    candidate.description
  );
  totalScore += descriptionSimilarity * 20;
  totalWeight += 20;

  // Factor 5: Same license type (weight: 10)
  const licenseSimilarity = seed.licenseKey && candidate.licenseKey
    ? (seed.licenseKey === candidate.licenseKey ? 100 : 30)
    : 50; // Neutral if either is missing
  totalScore += licenseSimilarity * 10;
  totalWeight += 10;

  return Math.round((totalScore / totalWeight) * 100) / 100;
}

/**
 * Calculate language similarity
 */
function calculateLanguageSimilarity(lang1: string | null, lang2: string | null): number {
  if (!lang1 || !lang2) return 0.3; // Partial credit if language unknown
  if (lang1.toLowerCase() === lang2.toLowerCase()) return 1;
  
  // Similar languages get partial credit
  const similarLanguages: Record<string, string[]> = {
    javascript: ['typescript', 'coffeescript'],
    typescript: ['javascript'],
    python: ['cython', 'jupyter notebook'],
    java: ['kotlin', 'scala', 'groovy'],
    'c++': ['c', 'c#'],
    c: ['c++'],
    'c#': ['f#', 'c++'],
    ruby: ['crystal'],
    go: ['rust'],
    rust: ['go', 'c++'],
  };

  const similar = similarLanguages[lang1.toLowerCase()];
  if (similar?.includes(lang2.toLowerCase())) return 0.7;

  return 0;
}

/**
 * Calculate topic overlap using Jaccard similarity
 */
function calculateTopicOverlap(topics1: string[], topics2: string[]): number {
  if (topics1.length === 0 || topics2.length === 0) return 0;

  const set1 = new Set(topics1.map(t => t.toLowerCase()));
  const set2 = new Set(topics2.map(t => t.toLowerCase()));

  // Calculate intersection
  const intersection = new Set([...set1].filter(t => set2.has(t)));
  
  // Calculate union
  const union = new Set([...set1, ...set2]);

  // Jaccard similarity
  return intersection.size / union.size;
}

/**
 * Calculate size similarity (repositories in same order of magnitude)
 */
function calculateSizeSimilarity(stars1: number, stars2: number): number {
  if (stars1 === 0 && stars2 === 0) return 1;
  if (stars1 === 0 || stars2 === 0) return 0.1;

  const ratio = Math.max(stars1, stars2) / Math.min(stars1, stars2);
  
  // Same order of magnitude = high similarity
  if (ratio <= 2) return 1;
  if (ratio <= 5) return 0.8;
  if (ratio <= 10) return 0.6;
  if (ratio <= 50) return 0.3;
  
  return 0.1;
}

/**
 * Calculate description similarity using keyword matching
 */
function calculateDescriptionSimilarity(
  desc1: string | null,
  desc2: string | null
): number {
  if (!desc1 || !desc2) return 0;

  // Extract keywords (words > 3 chars, not common words)
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'your', 'have', 'are',
    'was', 'were', 'been', 'being', 'has', 'had', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'about',
  ]);

  const extractKeywords = (text: string): Set<string> => {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word))
    );
  };

  const keywords1 = extractKeywords(desc1);
  const keywords2 = extractKeywords(desc2);

  if (keywords1.size === 0 || keywords2.size === 0) return 0;

  // Calculate overlap
  const intersection = new Set([...keywords1].filter(k => keywords2.has(k)));
  const minSize = Math.min(keywords1.size, keywords2.size);

  return intersection.size / minSize;
}

// ============================================================================
// MATCH REASONS
// ============================================================================

/**
 * Generate human-readable reasons why repositories are similar
 */
function getMatchReasons(seed: Repository, candidate: Repository): string[] {
  const reasons: string[] = [];

  // Same language
  if (
    seed.language &&
    candidate.language &&
    seed.language.toLowerCase() === candidate.language.toLowerCase()
  ) {
    reasons.push(`Same language: ${seed.language}`);
  }

  // Shared topics
  const sharedTopics = seed.topics.filter(t =>
    candidate.topics.map(ct => ct.toLowerCase()).includes(t.toLowerCase())
  );
  if (sharedTopics.length > 0) {
    const displayTopics = sharedTopics.slice(0, 3).join(', ');
    reasons.push(
      `Shared topics: ${displayTopics}${sharedTopics.length > 3 ? '...' : ''}`
    );
  }

  // Similar size
  if (seed.starsCount > 0 && candidate.starsCount > 0) {
    const ratio = Math.max(seed.starsCount, candidate.starsCount) /
                  Math.min(seed.starsCount, candidate.starsCount);
    if (ratio <= 3) {
      reasons.push('Similar popularity');
    }
  }

  // Same license
  if (seed.licenseKey && seed.licenseKey === candidate.licenseKey) {
    reasons.push(`Same license: ${seed.licenseName || seed.licenseKey}`);
  }

  // If no specific reasons, add a generic one
  if (reasons.length === 0) {
    reasons.push('Related by community connections');
  }

  return reasons;
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Convert full repository to summary
 */
function toSummary(repo: Repository): RepositorySummary {
  return {
    id: repo.id,
    owner: repo.owner,
    name: repo.name,
    fullName: repo.fullName,
    description: repo.description,
    language: repo.language,
    starsCount: repo.starsCount,
    forksCount: repo.forksCount,
    topics: repo.topics,
  };
}
