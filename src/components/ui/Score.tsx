/**
 * ============================================================================
 * DISCOVER: Score Display Component
 * Description: Visual display of repository health scores
 * ============================================================================
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { getScoreColor, getScoreBgColor } from './variants';
import { SimpleTooltip } from './Tooltip';
import {
  Activity,
  Users,
  Wrench,
  Star,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// ============================================================================
// Score Circle
// ============================================================================

export interface ScoreCircleProps {
  /** Score value (0-100) */
  score: number;
  /** Size of the circle */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Label to show below score */
  label?: string;
  /** Show score trend */
  trend?: number | null;
  /** Additional class names */
  className?: string;
}

const circleSizes = {
  sm: { size: 48, stroke: 4, fontSize: 'text-sm' },
  md: { size: 64, stroke: 5, fontSize: 'text-lg' },
  lg: { size: 80, stroke: 6, fontSize: 'text-xl' },
  xl: { size: 120, stroke: 8, fontSize: 'text-3xl' },
};

/**
 * Circular score display with animated progress
 */
export const ScoreCircle: React.FC<ScoreCircleProps> = ({
  score,
  size = 'md',
  label,
  trend,
  className,
}) => {
  const config = circleSizes[size];
  const radius = (config.size - config.stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = ((100 - score) / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {/* Circle container */}
      <div className="relative" style={{ width: config.size, height: config.size }}>
        <svg
          className="transform -rotate-90"
          width={config.size}
          height={config.size}
        >
          {/* Background circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={config.size / 2}
            cy={config.size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            className={cn(
              'transition-all duration-1000 ease-out',
              score >= 80 && 'text-green-500',
              score >= 60 && score < 80 && 'text-blue-500',
              score >= 40 && score < 60 && 'text-yellow-500',
              score >= 20 && score < 40 && 'text-orange-500',
              score < 20 && 'text-red-500'
            )}
          />
        </svg>

        {/* Score text */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
        >
          <span className={cn('font-bold', config.fontSize, getScoreColor(score))}>
            {Math.round(score)}
          </span>
          {trend !== undefined && trend !== null && (
            <span
              className={cn(
                'flex items-center text-xs',
                trend > 0 && 'text-green-600',
                trend < 0 && 'text-red-600',
                trend === 0 && 'text-gray-500'
              )}
            >
              {trend > 0 && <TrendingUp className="h-3 w-3 mr-0.5" />}
              {trend < 0 && <TrendingDown className="h-3 w-3 mr-0.5" />}
              {trend === 0 && <Minus className="h-3 w-3 mr-0.5" />}
              {trend > 0 ? `+${trend}` : trend}
            </span>
          )}
        </div>
      </div>

      {/* Label */}
      {label && (
        <span className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {label}
        </span>
      )}
    </div>
  );
};

// ============================================================================
// Score Bar
// ============================================================================

export interface ScoreBarProps {
  /** Score value (0-100) */
  score: number;
  /** Label for the score */
  label: string;
  /** Icon to show */
  icon?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

/**
 * Horizontal score bar with label
 */
export const ScoreBar: React.FC<ScoreBarProps> = ({
  score,
  label,
  icon,
  className,
}) => {
  return (
    <div className={cn('space-y-1', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-gray-500 dark:text-gray-400">{icon}</span>
          )}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
        </div>
        <span className={cn('text-sm font-semibold', getScoreColor(score))}>
          {Math.round(score)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            score >= 80 && 'bg-green-500',
            score >= 60 && score < 80 && 'bg-blue-500',
            score >= 40 && score < 60 && 'bg-yellow-500',
            score >= 20 && score < 40 && 'bg-orange-500',
            score < 20 && 'bg-red-500'
          )}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// Score Breakdown
// ============================================================================

export interface ScoreBreakdownProps {
  /** Overall score */
  overallScore: number;
  /** Activity dimension score */
  activityScore: number;
  /** Community dimension score */
  communityScore: number;
  /** Maintenance dimension score */
  maintenanceScore: number;
  /** Popularity dimension score */
  popularityScore: number;
  /** Quality dimension score (optional) */
  qualityScore?: number;
  /** Layout direction */
  layout?: 'horizontal' | 'vertical';
  /** Show overall score */
  showOverall?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Complete score breakdown with all dimensions
 */
export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  overallScore,
  activityScore,
  communityScore,
  maintenanceScore,
  popularityScore,
  qualityScore,
  layout = 'vertical',
  showOverall = true,
  className,
}) => {
  const dimensions = [
    {
      key: 'activity',
      label: 'Activity',
      score: activityScore,
      icon: <Activity className="h-4 w-4" />,
      tooltip: 'Recent commits, PRs, and development activity',
    },
    {
      key: 'community',
      label: 'Community',
      score: communityScore,
      icon: <Users className="h-4 w-4" />,
      tooltip: 'Contributors, discussions, and community engagement',
    },
    {
      key: 'maintenance',
      label: 'Maintenance',
      score: maintenanceScore,
      icon: <Wrench className="h-4 w-4" />,
      tooltip: 'Issue resolution, PR merges, and project upkeep',
    },
    {
      key: 'popularity',
      label: 'Popularity',
      score: popularityScore,
      icon: <Star className="h-4 w-4" />,
      tooltip: 'Stars, forks, and project visibility',
    },
    ...(qualityScore !== undefined
      ? [
          {
            key: 'quality',
            label: 'Quality',
            score: qualityScore,
            icon: <Shield className="h-4 w-4" />,
            tooltip: 'Documentation, license, and project completeness',
          },
        ]
      : []),
  ];

  if (layout === 'horizontal') {
    return (
      <div className={cn('flex items-center gap-6', className)}>
        {showOverall && (
          <ScoreCircle score={overallScore} size="lg" label="Overall" />
        )}
        <div className="flex flex-wrap gap-4">
          {dimensions.map((dim) => (
            <SimpleTooltip key={dim.key} content={dim.tooltip}>
              <div
                className={cn(
                  'flex flex-col items-center p-3 rounded-lg',
                  getScoreBgColor(dim.score)
                )}
              >
                <span className="text-gray-500 dark:text-gray-400 mb-1">
                  {dim.icon}
                </span>
                <span className={cn('text-lg font-bold', getScoreColor(dim.score))}>
                  {Math.round(dim.score)}
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {dim.label}
                </span>
              </div>
            </SimpleTooltip>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {showOverall && (
        <div className="flex items-center justify-center mb-6">
          <ScoreCircle score={overallScore} size="xl" label="Overall Score" />
        </div>
      )}
      <div className="space-y-3">
        {dimensions.map((dim) => (
          <SimpleTooltip key={dim.key} content={dim.tooltip} side="left">
            <div>
              <ScoreBar
                score={dim.score}
                label={dim.label}
                icon={dim.icon}
              />
            </div>
          </SimpleTooltip>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Score Badge
// ============================================================================

export interface ScoreBadgeProps {
  /** Score value (0-100) */
  score: number;
  /** Additional class names */
  className?: string;
}

/**
 * Compact score badge for inline display
 */
export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, className }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-sm font-semibold',
        getScoreBgColor(score),
        getScoreColor(score),
        className
      )}
    >
      {Math.round(score)}
    </span>
  );
};
