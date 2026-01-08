/**
 * ============================================================================
 * DISCOVER: Chart Components
 * Description: Recharts-based chart components for data visualization
 * ============================================================================
 */

'use client';

import * as React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart as RechartsAreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

// ============================================================================
// Types
// ============================================================================

export interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

export interface ChartSeries {
  key: string;
  name: string;
  color: string;
}

// ============================================================================
// Chart Colors
// ============================================================================

export const chartColors = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  // Multi-series colors
  series: [
    '#3b82f6', // blue
    '#22c55e', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ef4444', // red
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#84cc16', // lime
  ],
};

// ============================================================================
// Custom Tooltip
// ============================================================================

interface TooltipPayloadEntry {
  color?: string;
  name?: string;
  value?: number | string;
  dataKey?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  formatValue?: (value: number) => string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  formatValue = (v) => v.toLocaleString(),
}) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((entry: TooltipPayloadEntry, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatValue(Number(entry.value) || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Line Chart
// ============================================================================

export interface LineChartProps {
  /** Chart data */
  data: ChartDataPoint[];
  /** Series to display */
  series: ChartSeries[];
  /** Chart title */
  title?: string;
  /** Chart height */
  height?: number;
  /** Show grid */
  showGrid?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Format function for Y axis values */
  formatYAxis?: (value: number) => string;
  /** Format function for tooltip values */
  formatTooltip?: (value: number) => string;
  /** Additional class names */
  className?: string;
}

/**
 * Line chart for time series data
 */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  series,
  title,
  height = 300,
  showGrid = true,
  showLegend = true,
  formatYAxis = (v) => v.toLocaleString(),
  formatTooltip,
  className,
}) => {
  const content = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
          />
        )}
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-gray-500"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis}
          className="text-gray-500"
        />
        <Tooltip
          content={<CustomTooltip formatValue={formatTooltip ?? formatYAxis} />}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ paddingTop: 20 }}
            formatter={(value) => (
              <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
            )}
          />
        )}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );

  if (title) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return <div className={className}>{content}</div>;
};

// ============================================================================
// Area Chart
// ============================================================================

export interface AreaChartProps extends Omit<LineChartProps, 'series'> {
  /** Series to display */
  series: (ChartSeries & { gradient?: boolean })[];
  /** Stack areas */
  stacked?: boolean;
}

/**
 * Area chart with optional gradients
 */
export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  series,
  title,
  height = 300,
  showGrid = true,
  showLegend = true,
  stacked = false,
  formatYAxis = (v) => v.toLocaleString(),
  formatTooltip,
  className,
}) => {
  const content = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`gradient-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
          />
        )}
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-gray-500"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis}
          className="text-gray-500"
        />
        <Tooltip
          content={<CustomTooltip formatValue={formatTooltip ?? formatYAxis} />}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ paddingTop: 20 }}
            formatter={(value) => (
              <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
            )}
          />
        )}
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            fill={s.gradient !== false ? `url(#gradient-${s.key})` : s.color}
            fillOpacity={s.gradient !== false ? 1 : 0.3}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );

  if (title) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return <div className={className}>{content}</div>;
};

// ============================================================================
// Bar Chart
// ============================================================================

export interface BarChartProps extends Omit<LineChartProps, 'series'> {
  /** Series to display */
  series: ChartSeries[];
  /** Stack bars */
  stacked?: boolean;
  /** Bar orientation */
  layout?: 'horizontal' | 'vertical';
}

/**
 * Bar chart for comparisons
 */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  series,
  title,
  height = 300,
  showGrid = true,
  showLegend = true,
  stacked = false,
  formatYAxis = (v) => v.toLocaleString(),
  formatTooltip,
  className,
}) => {
  const content = (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            vertical={false}
          />
        )}
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-gray-500"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxis}
          className="text-gray-500"
        />
        <Tooltip
          content={<CustomTooltip formatValue={formatTooltip ?? formatYAxis} />}
        />
        {showLegend && (
          <Legend
            wrapperStyle={{ paddingTop: 20 }}
            formatter={(value) => (
              <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
            )}
          />
        )}
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color}
            radius={[4, 4, 0, 0]}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );

  if (title) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return <div className={className}>{content}</div>;
};

// ============================================================================
// Mini Sparkline
// ============================================================================

export interface SparklineProps {
  /** Data values */
  data: number[];
  /** Sparkline color */
  color?: string;
  /** Width of sparkline */
  width?: number;
  /** Height of sparkline */
  height?: number;
  /** Show trend indicator */
  showTrend?: boolean;
  /** Additional class names */
  className?: string;
}

/**
 * Mini sparkline for inline trend display
 */
export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = chartColors.primary,
  width = 80,
  height = 24,
  showTrend = false,
  className,
}) => {
  const chartData = data.map((value, index) => ({
    index,
    value,
  }));

  const trend = data.length >= 2 ? data[data.length - 1] - data[0] : 0;
  const trendPercent = data[0] !== 0 ? ((trend / data[0]) * 100).toFixed(1) : '0';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <ResponsiveContainer width={width} height={height}>
        <RechartsLineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
      {showTrend && (
        <span
          className={cn(
            'text-xs font-medium',
            trend > 0 && 'text-green-600',
            trend < 0 && 'text-red-600',
            trend === 0 && 'text-gray-500'
          )}
        >
          {trend > 0 ? '+' : ''}
          {trendPercent}%
        </span>
      )}
    </div>
  );
};
