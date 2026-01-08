/**
 * ============================================================================
 * DISCOVER: Repository Card Component
 * Description: Card displaying repository information
 * ============================================================================
 */

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { Badge, LanguageBadge } from './Badge';
import { ScoreBadge } from './Score';
import { SimpleTooltip } from './Tooltip';
import { getRankChangeIndicator } from './variants';
import {
  Star,
  GitFork,
  Eye,
  AlertCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Archive,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

export interface RepositoryCardData {
  owner: string;
  name: string;
  fullName: string;
  description?: string | null;
  language?: string | null;
  topics?: string[];
  starsCount: number;
  forksCount: number;
  watchersCount?: number;
  openIssuesCount?: number;
  licenseKey?: string | null;
  isArchived?: boolean;
  githubPushedAt?: string | null;
  score?: {
    overallScore: number;
    activityScore?: number;
    communityScore?: number;
    maintenanceScore?: number;
  } | null;
  ranking?: {
    rank: number;
    rankChange: number | null;
  } | null;
}

export interface RepositoryCardProps {
  /** Repository data */
  repository: RepositoryCardData;
  /** Card variant */
  variant?: 'default' | 'compact' | 'detailed';
  /** Show rank badge */
  showRank?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Format Helpers
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

// ============================================================================
// Repository Card
// ============================================================================

/**
 * Repository card with stats and score
 */
export const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repository,
  variant = 'default',
  showRank = false,
  className,
}) => {
  const {
    owner,
    name,
    fullName,
    description,
    language,
    topics = [],
    starsCount,
    forksCount,
    watchersCount,
    openIssuesCount,
    licenseKey,
    isArchived,
    githubPushedAt,
    score,
    ranking,
  } = repository;

  const rankIndicator = ranking ? getRankChangeIndicator(ranking.rankChange) : null;

  // Compact variant
  if (variant === 'compact') {
    return (
      <Card
        variant="interactive"
        padding="sm"
        className={cn('group', className)}
      >
        <Link
          href={`/repos/${owner}/${name}`}
          className="flex items-center gap-4"
        >
          {/* Rank */}
          {showRank && ranking && (
            <div className="flex flex-col items-center min-w-[48px]">
              <span className="text-lg font-bold text-foreground">
                #{ranking.rank}
              </span>
              {rankIndicator && (
                <span className={cn('text-xs flex items-center', rankIndicator.color)}>
                  {rankIndicator.icon === 'up' && <TrendingUp className="h-3 w-3" />}
                  {rankIndicator.icon === 'down' && <TrendingDown className="h-3 w-3" />}
                  {rankIndicator.icon === 'neutral' && <Minus className="h-3 w-3" />}
                  <span className="ml-0.5">{rankIndicator.text}</span>
                </span>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground truncate">
                {fullName}
              </span>
              {isArchived && (
                <Badge variant="warning" size="sm">
                  <Archive className="h-3 w-3 mr-0.5" />
                  Archived
                </Badge>
              )}
            </div>
            {language && (
              <span className="text-sm text-muted-foreground">
                {language}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              {formatNumber(starsCount)}
            </span>
            {score && <ScoreBadge score={score.overallScore} />}
          </div>
        </Link>
      </Card>
    );
  }

  // Default and detailed variants
  return (
    <Card
      variant="interactive"
      padding="md"
      className={cn('group', className)}
    >
      <Link href={`/repos/${owner}/${name}`} className="block">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Name */}
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {fullName}
              </h3>
              {isArchived && (
                <Badge variant="warning" size="sm">
                  <Archive className="h-3 w-3 mr-0.5" />
                  Archived
                </Badge>
              )}
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Description */}
            {description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                {description}
              </p>
            )}
          </div>

          {/* Score */}
          {score && (
            <div className="shrink-0">
              <ScoreBadge score={score.overallScore} />
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mt-3 flex flex-wrap gap-2">
          {language && <LanguageBadge language={language} size="sm" />}
          {topics.slice(0, 4).map((topic) => (
            <Badge key={topic} variant="default" size="sm">
              {topic}
            </Badge>
          ))}
          {topics.length > 4 && (
            <Badge variant="default" size="sm">
              +{topics.length - 4}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <SimpleTooltip content="Stars">
            <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <Star className="h-4 w-4" />
              {formatNumber(starsCount)}
            </span>
          </SimpleTooltip>

          <SimpleTooltip content="Forks">
            <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <GitFork className="h-4 w-4" />
              {formatNumber(forksCount)}
            </span>
          </SimpleTooltip>

          {watchersCount !== undefined && (
            <SimpleTooltip content="Watchers">
              <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                <Eye className="h-4 w-4" />
                {formatNumber(watchersCount)}
              </span>
            </SimpleTooltip>
          )}

          {openIssuesCount !== undefined && (
            <SimpleTooltip content="Open Issues">
              <span className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                <AlertCircle className="h-4 w-4" />
                {formatNumber(openIssuesCount)}
              </span>
            </SimpleTooltip>
          )}

          {licenseKey && (
            <Badge variant="default" size="sm">
              {licenseKey.toUpperCase()}
            </Badge>
          )}

          {githubPushedAt && (
            <SimpleTooltip content="Last updated">
              <span className="flex items-center gap-1.5 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                {formatDistanceToNow(new Date(githubPushedAt), { addSuffix: true })}
              </span>
            </SimpleTooltip>
          )}
        </div>

        {/* Detailed variant: Show more info */}
        {variant === 'detailed' && score && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Activity</div>
                <div className={cn('font-semibold', getScoreTextColor(score.activityScore ?? 0))}>
                  {Math.round(score.activityScore ?? 0)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Community</div>
                <div className={cn('font-semibold', getScoreTextColor(score.communityScore ?? 0))}>
                  {Math.round(score.communityScore ?? 0)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Maintenance</div>
                <div className={cn('font-semibold', getScoreTextColor(score.maintenanceScore ?? 0))}>
                  {Math.round(score.maintenanceScore ?? 0)}
                </div>
              </div>
              {ranking && (
                <div>
                  <div className="text-xs text-muted-foreground">Rank</div>
                  <div className="font-semibold text-foreground">
                    #{ranking.rank}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Link>
    </Card>
  );
};

/**
 * Get text color class based on score
 */
function getScoreTextColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-blue-600 dark:text-blue-400';
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 20) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}

export default RepositoryCard;
